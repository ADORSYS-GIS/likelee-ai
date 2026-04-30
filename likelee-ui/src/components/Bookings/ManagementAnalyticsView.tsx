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

export const ManagementAnalyticsView = ({ bookings }: { bookings: any[] }) => {
  const [activeTab, setActiveTab] = useState("Analytics");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              Management & Analytics
            </h2>
          </div>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Filter, search, and analyze your bookings
          </p>
        </div>
        <div className="overflow-x-auto">
          <div className="flex bg-gray-100 p-1 rounded-lg w-max min-w-full sm:min-w-0 sm:w-fit">
            {["Analytics", "Manage Bookings", "Reports & Export"].map((tab) => (
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

      {activeTab === "Analytics" && (
        <ManagementAnalyticsTab bookings={bookings} />
      )}
      {activeTab === "Manage Bookings" && (
        <ManageBookingsTab bookings={bookings} />
      )}
      {activeTab === "Reports & Export" && (
        <ReportsExportTab bookings={bookings} />
      )}
    </div>
  );
};

const ManagementAnalyticsTab = ({ bookings }: { bookings: any[] }) => {
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
    const t = normalizeType(type);
    if (t === "test-shoot") return "Test Shoot";
    return t
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
      label: "This Month",
      value: overviewStats.monthCount.toString(),
      subtext: "Total bookings",
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "This Week",
      value: overviewStats.weekCount.toString(),
      subtext: "Total bookings",
      icon: Calendar,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Revenue",
      value: `$${overviewStats.monthRevenue.toLocaleString()}`,
      subtext: "This month",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Conversion",
      value: conversionPct,
      subtext: "This month",
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
            Bookings by Type
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
              <p className="text-sm text-gray-500">No bookings yet</p>
            )}
          </div>
        </Card>

        <Card className="p-6 border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">
              Top Booked Talent
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
                {topTalent.count} bookings
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const ManageBookingsTab = ({ bookings }: { bookings: any[] }) => {
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
          placeholder="Search by talent, client, location, or notes..."
          className="pl-10 h-10 bg-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Card className="p-6 border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-900" />
          <h3 className="font-bold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <Label className="font-bold text-xs uppercase text-gray-500 mb-3 block">
              Talent
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
              Client
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
              Booking Type
            </Label>
            <div className="space-y-2">
              {["Casting", "Option", "Confirmed", "Completed", "Cancelled"].map(
                (t) => (
                  <div key={t} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`bt-${t}`}
                      className="rounded border-gray-300"
                    />
                    <label
                      htmlFor={`bt-${t}`}
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      {t}
                    </label>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <Label className="font-bold text-xs uppercase text-gray-500 mb-3 block">
              Status
            </Label>
            <div className="space-y-2">
              {[
                "Pending Confirmation",
                "Confirmed",
                "Completed",
                "Cancelled",
              ].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`s-${s}`}
                    className="rounded border-gray-300"
                  />
                  <label
                    htmlFor={`s-${s}`}
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    {s}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <Label className="font-bold text-xs uppercase text-gray-500 mb-3 block">
              Date Range
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                placeholder="Start Date"
              />
              <Input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                placeholder="End Date"
              />
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <Label className="font-bold text-xs uppercase text-gray-500 mb-3 block">
              Rate Range ($)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Min"
                type="number"
                value={rateMin}
                onChange={(e) => setRateMin(e.target.value)}
              />
              <Input
                placeholder="Max"
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
          <span className="text-sm font-bold text-gray-700">Sort by:</span>
          <Select value={sortKey} onValueChange={setSortKey}>
            <SelectTrigger className="w-full sm:w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bookingDate">Booking Date</SelectItem>
              <SelectItem value="talentName">Talent Name</SelectItem>
              <SelectItem value="clientName">Client Name</SelectItem>
              <SelectItem value="rateAmount">Rate Amount</SelectItem>
              <SelectItem value="createdDate">Created Date</SelectItem>
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
          Results ({filteredAndSortedBookings.length})
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
                    {pickString(booking?.status, booking?.type) || "Pending"} •{" "}
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
                      : "No date"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {pickString(booking?.call_time, booking?.callTime) ||
                      "--:--"}
                  </p>
                </div>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-3">
                  {pickString(booking?.status, booking?.type) || "Pending"}
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
            <p>No bookings found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ReportsExportTab = ({ bookings }: { bookings?: any[] }) => {
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
      title: "Scheduled weekly reports via email!",
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

  return (
    <div className="space-y-6">
      <Card className="p-6 border shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900">Export Bookings</h3>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Export {bookingsCount} filtered bookings to your preferred format
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 border-green-200 hover:bg-green-50 hover:border-green-300 transition-all group"
            onClick={() => handleExport("CSV")}
          >
            <FileText className="w-6 h-6 text-green-600 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-green-700">Export to CSV</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all group"
            onClick={() => handleExport("PDF")}
          >
            <FileText className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-red-700">Export to PDF</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all group"
            onClick={() => handleExport("EXCEL")}
          >
            <FileText className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-blue-700">Export to Excel</span>
          </Button>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
          <h4 className="font-bold text-gray-900 mb-4">Included Columns:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              "Talent Name",
              "Client Name",
              "Booking Date",
              "Call Time",
              "Wrap Time",
              "Location",
              "Rate",
              "Type",
              "Status",
              "Notes",
              "Created Date",
              "Updated Date",
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
            Schedule Automated Reports
          </h3>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Receive booking reports automatically via email
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold">Report Frequency</Label>
            <Select defaultValue="weekly">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">
                  Daily (every morning at 8 AM)
                </SelectItem>
                <SelectItem value="weekly">
                  Weekly (every Monday at 8 AM)
                </SelectItem>
                <SelectItem value="monthly">
                  Monthly (1st of each month)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Email Recipients</Label>
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
