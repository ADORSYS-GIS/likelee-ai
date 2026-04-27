import React, { useMemo, useState, useEffect } from "react";
import {
  addDays,
  addMonths,
  format,
  getDaysInMonth,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { Calendar, Plus, ChevronDown, ChevronRight } from "lucide-react";
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
import { ManageAvailabilityModal } from "../Modals/ManageAvailabilityModal";
import { NewBookingModal } from "../Modals/NewBookingModal";
import { BookingDetailsModal } from "../Modals/BookingDetailsModal";
import { getAgencyRoster } from "@/api/functions";
import { useTranslation } from "react-i18next";

export const CalendarScheduleTab = ({
  bookings,
  onAddBooking,
  onUpdateBooking,
  onCancelBooking,
  bookOuts = [],
  onAddBookOut,
  onRemoveBookOut,
  fixedTalent,
  disableBookingEdits,
  isSportsAgency = false,
}: {
  bookings: any[];
  onAddBooking: (booking: any) => void;
  onUpdateBooking: (booking: any) => void;
  onCancelBooking: (id: string) => void;
  bookOuts?: any[];
  onAddBookOut: (bookOut: any) => void;
  onRemoveBookOut: (id: string) => void;
  fixedTalent?: { id: string; name: string };
  disableBookingEdits?: boolean;
  isSportsAgency?: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const entitySingularTitle = isSportsAgency ? "Athlete" : "Talent";
  const entitySingularLower = isSportsAgency ? "athlete" : "talent";
  const locale = i18n.resolvedLanguage || i18n.language || "en";
  const [modalOpen, setModalOpen] = useState(false);
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [bookingMode, setBookingMode] = useState<"new" | "edit" | "duplicate">(
    "new",
  );
  // Ensure currentDate starts at today, resolving 13th vs 14th issue
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [talentViewMode, setTalentViewMode] = useState<
    "single" | "all" | "selected"
  >("all");
  const [selectedTalentId, setSelectedTalentId] = useState<string>("");
  const [talents, setTalents] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (fixedTalent?.id) {
      if (fixedTalent.id === "all") {
        setTalents([]);
        setSelectedTalentId("");
        setTalentViewMode("all");
      } else {
        setTalents([{ id: fixedTalent.id, name: fixedTalent.name }]);
        setSelectedTalentId(fixedTalent.id);
        setTalentViewMode("single");
      }
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const resp = await getAgencyRoster();
        if (cancelled) return;
        const arr = Array.isArray(resp)
          ? resp
          : Array.isArray((resp as any)?.talents)
            ? (resp as any).talents
            : Array.isArray((resp as any)?.data?.talents)
              ? (resp as any).data.talents
              : [];
        const mapped = arr
          .map((r: any) => ({
            id: String(r.id || ""),
            name: String(r.full_name || r.name || r.stage_name || "Unnamed"),
          }))
          .filter((t: any) => t.id);
        setTalents(mapped);
        if (!selectedTalentId && mapped.length > 0) {
          setSelectedTalentId(mapped[0].id);
        }
      } catch (_e) {
        if (!cancelled) setTalents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTalentId]);

  const handlePrevDay = () => setCurrentDate((prev) => subDays(prev, 1));
  const handleNextDay = () => setCurrentDate((prev) => addDays(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Month Navigation for the stats/dropdowns logic if we want to change view
  const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));
  const handleMonthChange = (monthNameLower: string) => {
  const { t } = useTranslation();
    const months = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    const monthIndex = months.indexOf(monthNameLower);
    if (monthIndex < 0) return;

    setCurrentDate((prev) => {
      const year = prev.getFullYear();
      const currentDay = prev.getDate();
      const maxDayInTargetMonth = getDaysInMonth(new Date(year, monthIndex, 1));
      const nextDay = Math.min(currentDay, maxDayInTargetMonth);
      return new Date(year, monthIndex, nextDay);
    });
  };

  const handleDateInputChange = (value: string) => {
    if (!value) return;
    const nextDate = new Date(`${value}T12:00:00`);
    if (isNaN(nextDate.getTime())) return;
    setCurrentDate(nextDate);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disableBookingEdits) {
        if (e.key.toLowerCase() === "t") {
          handleToday();
        }
        return;
      }
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      )
        return;

      switch (e.key.toLowerCase()) {
        case "c":
          setNewBookingOpen(true);
          break;
        case "t":
          handleToday();
          break;
        case "escape":
          setDetailsModalOpen(false);
          setNewBookingOpen(false);
          break;
        case "arrowleft":
          handlePrevDay(); // Shortcut navigates on calendar (days)
          break;
        case "arrowright":
          handleNextDay(); // Shortcut navigates on calendar (days)
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const monthStr = format(currentDate, "yyyy-MM");
  const safeStr = (v?: any) => (typeof v === "string" ? v : "");

  const bookingTalentId = (b: any) => {
    const v = b?.talent_id || b?.talentId || b?.talent?.id;
    return typeof v === "string" ? v : v ? String(v) : "";
  };

  const activeTalentId = talentViewMode === "all" ? "" : selectedTalentId;

  const visibleBookings = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    if (!activeTalentId) return bookings;
    return bookings.filter((b: any) => bookingTalentId(b) === activeTalentId);
  }, [bookings, activeTalentId]);

  const visibleBookOuts = useMemo(() => {
    if (!Array.isArray(bookOuts)) return [];
    if (!activeTalentId) return bookOuts;
    return bookOuts.filter((bo: any) => {
      const v = bo?.talent_id || bo?.talentId;
      const id = typeof v === "string" ? v : v ? String(v) : "";
      return id === activeTalentId;
    });
  }, [bookOuts, activeTalentId]);

  const totalCount = Array.isArray(bookings) ? bookings.length : 0;
  const thisMonthCount = Array.isArray(bookings)
    ? bookings.filter((b: any) => safeStr(b.date).startsWith(monthStr)).length
    : 0;
  const confirmedCount = Array.isArray(bookings)
    ? bookings.filter(
        (b: any) => safeStr(b.status).toLowerCase() === "confirmed",
      ).length
    : 0;
  const pendingCount = Array.isArray(bookings)
    ? bookings.filter((b: any) => safeStr(b.status).toLowerCase() === "pending")
        .length
    : 0;
  const stats = [
    {
      label: t("talentPortal.content.irl.calendar.stats.totalBookings"),
      value: String(totalCount),
    },
    {
      label: t("talentPortal.content.irl.calendar.stats.thisMonth"),
      value: String(thisMonthCount),
    },
    {
      label: t("talentPortal.content.irl.calendar.stats.confirmed"),
      value: String(confirmedCount),
    },
    {
      label: t("talentPortal.content.irl.calendar.stats.pending"),
      value: String(pendingCount),
    },
  ];

  const months = Array.from({ length: 12 }, (_, idx) => ({
    value: [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ][idx],
    label: new Intl.DateTimeFormat(locale, { month: "long" }).format(
      new Date(2026, idx, 1),
    ),
  }));

  const days = Array.from({ length: 7 }, (_, idx) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      new Date(2026, 0, 4 + idx),
    ),
  );

  const translateStatus = (value?: string, fallbackKey?: string) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_");
    const map: Record<string, string> = {
      pending: "talentPortal.content.irl.shared.status.pending",
      confirmed: "talentPortal.content.irl.shared.status.confirmed",
      completed: "talentPortal.content.irl.shared.status.completed",
      cancelled: "talentPortal.content.irl.shared.status.cancelled",
      casting: "talentPortal.content.irl.calendar.legend.casting",
      option: "talentPortal.content.irl.calendar.legend.option",
      test_shoot: "talentPortal.content.irl.calendar.legend.testShoot",
      fitting: "talentPortal.content.irl.calendar.legend.fitting",
      rehearsal: "talentPortal.content.irl.calendar.legend.rehearsal",
      conflict: "talentPortal.content.irl.calendar.legend.conflict",
      unavailable: "talentPortal.content.irl.calendar.legend.unavailable",
    };

    const key = map[normalized] || fallbackKey;
    if (!key) return value || "";
    return t(key);
  };

  // Dynamic Calendar Calculation
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = startOfMonth(currentDate).getDay(); // 0 for Sunday
  const previousMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => {
    const date = subDays(startOfMonth(currentDate), firstDayOfMonth - i);
    return date.getDate();
  });

  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const trailingDaysCount =
    (7 - ((firstDayOfMonth + currentMonthDays.length) % 7)) % 7;
  const nextMonthDays = Array.from(
    { length: trailingDaysCount },
    (_, i) => i + 1,
  );

  const countBookOutsOnDate = (dateStr: string) => {
    if (!Array.isArray(visibleBookOuts) || visibleBookOuts.length === 0)
      return 0;
    return visibleBookOuts.filter((bo: any) => {
      const s = bo.startDate || bo.start_date;
      const e = bo.endDate || bo.end_date || s;
      if (typeof s !== "string" || typeof e !== "string") return false;
      return s <= dateStr && dateStr <= e;
    }).length;
  };

  const selectedTalentName = useMemo(() => {
    if (!selectedTalentId) return "";
    const t = talents.find((x) => x.id === selectedTalentId);
    return t?.name || "";
  }, [talents, selectedTalentId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {t("talentPortal.content.irl.calendar.scheduleTitle")}
          </h2>
          <p className="text-gray-500 font-medium text-sm mt-1">
            {t("talentPortal.content.irl.calendar.scheduleDescription", {
              entity: entitySingularLower,
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="font-bold text-gray-700 bg-white w-full sm:w-auto"
            onClick={() => setModalOpen(true)}
          >
            <Calendar className="w-4 h-4 mr-2" />{" "}
            {t("talentPortal.content.irl.calendar.manageAvailability")}
          </Button>
          {!disableBookingEdits && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full sm:w-auto"
              onClick={() => {
                setBookingMode("new");
                setSelectedBooking(null);
                setNewBookingOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />{" "}
              {t("talentPortal.content.irl.calendar.newBooking")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl"
          >
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">
              {s.label}
            </p>
            <p className="text-4xl font-extrabold text-gray-900">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div className="flex w-full xl:w-auto items-center gap-2 overflow-x-auto pb-1 flex-nowrap">
            <Select
              value={format(currentDate, "MMMM").toLowerCase()}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-28 sm:w-32 shrink-0">
                <SelectValue placeholder={format(currentDate, "MMMM")} />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={format(currentDate, "yyyy")}
              onValueChange={(val) => {
                const year = parseInt(val);
                const newDate = new Date(currentDate);
                newDate.setFullYear(year);
                setCurrentDate(newDate);
              }}
            >
              <SelectTrigger className="w-20 sm:w-24 shrink-0">
                <SelectValue placeholder={format(currentDate, "yyyy")} />
              </SelectTrigger>
              <SelectContent>
                {["2025", "2026", "2027", "2028", "2029"].map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1 shrink-0">
              {/* UI Arrows still control Month as is standard behaviour */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white hover:shadow-sm"
                onClick={handlePrevMonth}
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </Button>
              <Button
                variant="ghost"
                className="h-8 px-3 text-sm font-bold hover:bg-white hover:shadow-sm"
                onClick={handleToday}
              >
                {t("talentPortal.content.irl.calendar.shortcuts.today")}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white hover:shadow-sm"
                onClick={handleNextMonth}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="relative shrink-0">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                type="date"
                value={format(currentDate, "yyyy-MM-dd")}
                onChange={(e) => handleDateInputChange(e.target.value)}
                className="w-[150px] pl-9"
                aria-label={t("talentPortal.content.irl.calendar.selectDate")}
              />
            </div>
          </div>

          <div className="flex w-full xl:w-auto items-center gap-2 overflow-x-auto pb-1 flex-nowrap">
            <Select defaultValue="month">
              <SelectTrigger className="w-28 sm:w-32 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">
                  {t("talentPortal.content.irl.calendar.views.month")}
                </SelectItem>
                <SelectItem value="week">
                  {t("talentPortal.content.irl.calendar.views.week")}
                </SelectItem>
                <SelectItem value="day">
                  {t("talentPortal.content.irl.calendar.views.day")}
                </SelectItem>
                <SelectItem value="team">
                  {t("talentPortal.content.irl.calendar.views.teamView")}
                </SelectItem>
                <SelectItem value="agenda">
                  {t("talentPortal.content.irl.calendar.views.agenda")}
                </SelectItem>
              </SelectContent>
            </Select>
            {!fixedTalent?.id && (
              <>
                <Select
                  value={talentViewMode}
                  onValueChange={(v) => setTalentViewMode(v as any)}
                >
                  <SelectTrigger className="w-32 sm:w-40 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">
                      {t("talentPortal.content.irl.calendar.talentView.single")}
                    </SelectItem>
                    <SelectItem value="all">
                      {t("talentPortal.content.irl.calendar.talentView.all", {
                        entity: entitySingularTitle,
                      })}
                    </SelectItem>
                    <SelectItem value="selected">
                      {t(
                        "talentPortal.content.irl.calendar.talentView.selected",
                        {
                          entity: entitySingularTitle,
                        },
                      )}
                    </SelectItem>
                  </SelectContent>
                </Select>

                {talentViewMode !== "all" && (
                  <Select
                    value={selectedTalentId}
                    onValueChange={setSelectedTalentId}
                  >
                    <SelectTrigger className="w-40 sm:w-48 shrink-0">
                      <SelectValue
                        placeholder={t(
                          "talentPortal.content.irl.calendar.talentView.select",
                          {
                            entity: entitySingularLower,
                          },
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {talents.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}

            {!disableBookingEdits && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold whitespace-nowrap shrink-0"
                onClick={() => {
                  setBookingMode("new");
                  setSelectedBooking(null);
                  setNewBookingOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />{" "}
                {t("talentPortal.content.irl.calendar.newBooking")}
              </Button>
            )}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400 mb-4 px-2">
          <span className="flex items-center gap-1">
            <span className="border p-0.5 rounded px-1">←</span>{" "}
            <span className="border p-0.5 rounded px-1">→</span>{" "}
            {t("talentPortal.content.irl.calendar.shortcuts.navigate")}
          </span>
          <span className="flex items-center gap-1">
            <span className="border p-0.5 rounded px-1">T</span>{" "}
            {t("talentPortal.content.irl.calendar.shortcuts.today")}
          </span>
          <span className="flex items-center gap-1">
            <span className="border p-0.5 rounded px-1">C</span>{" "}
            {t("talentPortal.content.irl.calendar.shortcuts.newBooking")}
          </span>
          <span className="flex items-center gap-1">
            <span className="border p-0.5 rounded px-1">ESC</span>{" "}
            {t("talentPortal.content.irl.calendar.shortcuts.close")}
          </span>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 border-b bg-gray-50/50">
              {days.map((d) => (
                <div
                  key={d}
                  className="p-3 text-center text-sm font-bold text-gray-600"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-[120px] divide-x divide-y">
              {/* Previous Month Filler */}
              {previousMonthDays.map((d) => (
                <div
                  key={`prev-${d}`}
                  className="p-2 text-gray-400 text-sm font-medium bg-gray-50/20"
                >
                  {d}
                </div>
              ))}
              {/* Current Month Days */}
              {currentMonthDays.map((d) => {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;
                const dayString = `${year}-${month.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
                const dayBookings = visibleBookings.filter((b) => {
                  // Normalize date to YYYY-MM-DD by taking first 10 chars or splitting on "T"
                  let bDate = "";
                  if (typeof b.date === "string") {
                    bDate = b.date.includes("T")
                      ? b.date.split("T")[0]
                      : b.date.slice(0, 10);
                  }
                  return bDate === dayString;
                });
                const dayBookOutsCount = countBookOutsOnDate(dayString);

                const getEventColor = (type?: string, status?: string) => {
                  const s = (status || "").toLowerCase();
                  const t = (type || "").toLowerCase();
                  // Status overrides
                  if (s === "cancelled") return "bg-red-200 text-gray-900";
                  if (s === "completed") return "bg-purple-200 text-gray-900";
                  if (s === "confirmed") return "bg-green-200 text-gray-900";
                  // Otherwise color by type (legend)
                  switch (t) {
                    case "casting":
                      return "bg-blue-100 text-gray-900";
                    case "option":
                      return "bg-yellow-100 text-gray-900";
                    case "confirmed":
                      return "bg-green-200 text-gray-900";
                    case "test-shoot":
                      return "bg-orange-100 text-gray-900";
                    case "fitting":
                      return "bg-yellow-50 text-gray-900";
                    case "rehearsal":
                      return "bg-gray-200 text-gray-900";
                    default:
                      // Fall back to status pending or generic
                      if (s === "pending") return "bg-gray-200 text-gray-900";
                      return "bg-indigo-200 text-gray-900";
                  }
                };

                const isSelected = d === currentDate.getDate();

                return (
                  <div
                    key={d}
                    className={`p-2 h-full overflow-hidden flex flex-col relative group hover:bg-gray-50 transition-colors ${
                      isSelected
                        ? "bg-blue-50/10 ring-2 ring-indigo-600 inset-0 z-10"
                        : ""
                    }`}
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      newDate.setDate(d);
                      // First click selects the day; clicking the already-selected day opens New Booking
                      const wasSelected = d === currentDate.getDate();
                      setCurrentDate(newDate);
                      if (wasSelected) {
                        setBookingMode("new");
                        setSelectedBooking({
                          date: dayString,
                          ...(selectedTalentName
                            ? {
                                talentName: selectedTalentName,
                                talent_name: selectedTalentName,
                              }
                            : {}),
                        });
                        setNewBookingOpen(true);
                      }
                    }}
                  >
                    <span
                      className={`text-sm font-medium shrink-0 ${
                        isSelected
                          ? "bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center -ml-1 -mt-1"
                          : "text-gray-700"
                      }`}
                    >
                      {d}
                    </span>
                    <div className="mt-1 space-y-1 flex-1 min-h-0 overflow-y-auto pr-1 no-scrollbar">
                      {dayBookings.map((b, idx) => {
                        const statusVal = (b.status || b.booking_status) as
                          | string
                          | undefined;
                        const typeVal = (b.type ||
                          b.bookingType ||
                          b.booking_type) as string | undefined;
                        const pick = (v?: any) =>
                          typeof v === "string" && v.trim().length > 0
                            ? v.trim()
                            : undefined;
                        const displayName =
                          pick(b.talent_name) ||
                          pick(b.talentName) ||
                          pick(b?.talent?.full_name) ||
                          pick(b?.talent?.name) ||
                          pick(b.client_name) ||
                          t("talentPortal.content.irl.calendar.untitled");
                        // TEMP: debug what drives color (remove after validation)
                        // console.debug("calendar booking", { date: dayString, status: statusVal, type: typeVal, name: displayName, id: b.id });
                        return (
                          <div
                            key={`${b.id} - ${idx}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(b);
                              setDetailsModalOpen(true);
                            }}
                            className={
                              getEventColor(typeVal, statusVal) +
                              " w-full h-7 flex items-center text-sm px-3 rounded-md font-semibold whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer hover:opacity-90 border border-black/5 shadow-sm"
                            }
                            title={displayName}
                          >
                            {displayName}
                          </div>
                        );
                      })}
                      {dayBookOutsCount > 0 && (
                        <div
                          className="bg-red-100 text-red-700 w-full h-7 flex items-center text-xs px-3 rounded-md font-bold whitespace-nowrap overflow-hidden text-ellipsis border border-red-200"
                          title={t(
                            "talentPortal.content.irl.calendar.bookOutsTitle",
                            {
                              count: dayBookOutsCount,
                            },
                          )}
                        >
                          ✕{" "}
                          {t(
                            "talentPortal.content.irl.calendar.bookOutsLabel",
                            {
                              count: dayBookOutsCount,
                            },
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Next Month Filler */}
              {nextMonthDays.map((d) => (
                <div
                  key={`next-${d}`}
                  className="p-2 text-gray-400 text-sm font-medium bg-gray-50/20"
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-xs font-medium text-gray-600">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-100 rounded-sm"></div>{" "}
            {t("talentPortal.content.irl.calendar.legend.casting")}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-100 rounded-sm"></div>{" "}
            {t("talentPortal.content.irl.calendar.legend.option")}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 rounded-sm"></div>{" "}
            {t("talentPortal.content.irl.calendar.legend.confirmed")}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>{" "}
            {t("talentPortal.content.irl.calendar.legend.pending")}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-100 rounded-sm"></div>{" "}
            {t("talentPortal.content.irl.calendar.legend.completed")}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-100 rounded-sm"></div>{" "}
            {t("talentPortal.content.irl.calendar.legend.cancelled")}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-100 rounded-sm"></div>{" "}
            {t("talentPortal.content.irl.calendar.legend.testShoot")}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-50 rounded-sm"></div>{" "}
            {t("talentPortal.content.irl.calendar.legend.fitting")}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>{" "}
            {t("talentPortal.content.irl.calendar.legend.rehearsal")}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-100 rounded-sm flex items-center justify-center text-[8px] text-red-600 font-bold">
              ✕
            </div>{" "}
            {t("talentPortal.content.irl.calendar.legend.unavailable")}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-50 rounded-sm flex items-center justify-center text-[8px] text-red-600 font-bold">
              !
            </div>{" "}
            {t("talentPortal.content.irl.calendar.legend.conflict")}
          </span>
        </div>
      </Card>

      <ManageAvailabilityModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        bookOuts={visibleBookOuts}
        onAddBookOut={onAddBookOut}
        onRemoveBookOut={onRemoveBookOut}
        fixedTalent={fixedTalent}
        isSportsAgency={isSportsAgency}
      />
      {!disableBookingEdits && (
        <NewBookingModal
          open={newBookingOpen}
          onOpenChange={setNewBookingOpen}
          isSportsAgency={isSportsAgency}
          onSave={(b) => {
            if (bookingMode === "edit") {
              onUpdateBooking(b);
            } else {
              onAddBooking(b);
            }
          }}
          initialData={selectedBooking}
          mode={bookingMode}
        />
      )}

      <BookingDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        booking={selectedBooking}
        isSportsAgency={isSportsAgency}
        onEdit={(b) => {
          if (disableBookingEdits) return;
          setSelectedBooking(b);
          setBookingMode("edit");
          setDetailsModalOpen(false);
          setNewBookingOpen(true);
        }}
        onDuplicate={(b) => {
          if (disableBookingEdits) return;
          setSelectedBooking(b);
          setBookingMode("duplicate");
          setDetailsModalOpen(false);
          setNewBookingOpen(true);
        }}
        onCancel={onCancelBooking}
      />
    </div>
  );
};
