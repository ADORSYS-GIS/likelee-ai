import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { ManageAvailabilityModal } from "../Modals/ManageAvailabilityModal";
import { NewBookingModal } from "../Modals/NewBookingModal";
import { BookingDetailsModal } from "../Modals/BookingDetailsModal";

export const CalendarScheduleTab = ({
  bookings,
  onAddBooking,
  onUpdateBooking,
  onCancelBooking,
}: {
  bookings: any[];
  onAddBooking: (booking: any) => void;
  onUpdateBooking: (booking: any) => void;
  onCancelBooking: (id: string) => void;
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [bookingMode, setBookingMode] = useState<"new" | "edit" | "duplicate">(
    "new",
  );
  // Ensure currentDate starts at today, resolving 13th vs 14th issue
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const handlePrevDay = () => setCurrentDate((prev) => subDays(prev, 1));
  const handleNextDay = () => setCurrentDate((prev) => addDays(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Month Navigation for the stats/dropdowns logic if we want to change view
  const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  const stats = [
    { label: "Total Bookings", value: "1" },
    { label: "This Month", value: "1" },
    { label: "Confirmed", value: "1" },
    { label: "Pending", value: "0" },
  ];

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Dynamic Calendar Calculation
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = startOfMonth(currentDate).getDay(); // 0 for Sunday
  const previousMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => {
    const date = subDays(startOfMonth(currentDate), firstDayOfMonth - i);
    return date.getDate();
  });

  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Bookings & Schedule
          </h2>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Manage your talent's bookings and availability
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="font-bold text-gray-700 bg-white"
            onClick={() => setModalOpen(true)}
          >
            <Calendar className="w-4 h-4 mr-2" /> Manage Availability
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            onClick={() => {
              setBookingMode("new");
              setSelectedBooking(null);
              setNewBookingOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> New Booking
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
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
          <div className="flex items-center gap-2">
            <Select
              value={format(currentDate, "MMMM").toLowerCase()}
              onValueChange={(val) => {
                // Approximate set month logic if needed
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder={format(currentDate, "MMMM")} />
              </SelectTrigger>
              <SelectContent>
                {[
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ].map((m) => (
                  <SelectItem key={m} value={m.toLowerCase()}>
                    {m}
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
              <SelectTrigger className="w-24">
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
            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
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
                Today
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

            {/* Date Picker Trigger */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={
                    "w-[140px] justify-start text-left font-normal border-gray-200"
                  }
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {currentDate ? (
                    format(currentDate, "MM/dd/yyyy")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => date && setCurrentDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <Select defaultValue="month">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="team">Team View</SelectItem>
                <SelectItem value="agenda">Agenda</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="single">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single View</SelectItem>
                <SelectItem value="all">All Talent</SelectItem>
                <SelectItem value="selected">Selected Talent</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              onClick={() => {
                setBookingMode("new");
                setSelectedBooking(null);
                setNewBookingOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> New Booking
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-400 mb-4 px-2">
          <span className="flex items-center gap-1">
            <span className="border p-0.5 rounded px-1">←</span>{" "}
            <span className="border p-0.5 rounded px-1">→</span> Navigate
          </span>
          <span className="flex items-center gap-1">
            <span className="border p-0.5 rounded px-1">T</span> Today
          </span>
          <span className="flex items-center gap-1">
            <span className="border p-0.5 rounded px-1">C</span> New Booking
          </span>
          <span className="flex items-center gap-1">
            <span className="border p-0.5 rounded px-1">ESC</span> Close
          </span>
        </div>

        <div className="border rounded-lg overflow-hidden">
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
              const dayBookings = bookings.filter((b) => b.date === dayString);

              const getTypeColor = (type: string) => {
                switch (type) {
                  case "casting":
                    return "bg-blue-100 text-blue-800";
                  case "option":
                    return "bg-yellow-100 text-yellow-800";
                  case "confirmed":
                    return "bg-green-100 text-green-800";
                  case "test-shoot":
                    return "bg-orange-100 text-orange-800";
                  case "fitting":
                    return "bg-yellow-50 text-yellow-700";
                  case "rehearsal":
                    return "bg-gray-200 text-gray-800";
                  default:
                    return "bg-indigo-100 text-indigo-800";
                }
              };

              const isSelected = d === currentDate.getDate();

              return (
                <div
                  key={d}
                  className={`p-2 relative group hover:bg-gray-50 transition-colors ${
                    isSelected
                      ? "bg-blue-50/10 ring-2 ring-indigo-600 inset-0 z-10"
                      : ""
                  }`}
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setDate(d);
                    setCurrentDate(newDate);
                  }}
                >
                  <span
                    className={`text-sm font-medium ${
                      isSelected
                        ? "bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center -ml-1 -mt-1"
                        : "text-gray-700"
                    }`}
                  >
                    {d}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayBookings.map((b, idx) => (
                      <div
                        key={`${b.id} - ${idx}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(b);
                          setDetailsModalOpen(true);
                        }}
                        className={`${getTypeColor(b.type)} text-[10px] p-1 rounded font-bold truncate border-l-2 border-current cursor-pointer hover:opacity-80 transition-opacity`}
                      >
                        {b.talentName}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-xs font-medium text-gray-600">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-100 rounded-sm"></div> Casting
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-100 rounded-sm"></div> Option
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 rounded-sm"></div> Confirmed
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-100 rounded-sm"></div> Completed
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-100 rounded-sm"></div> Cancelled
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-100 rounded-sm"></div> Test Shoot
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-50 rounded-sm"></div> Fitting
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-200 rounded-sm"></div> Rehearsal
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-100 rounded-sm flex items-center justify-center text-[8px] text-red-600 font-bold">
              ✕
            </div>{" "}
            Unavailable
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-50 rounded-sm flex items-center justify-center text-[8px] text-red-600 font-bold">
              !
            </div>{" "}
            Conflict
          </span>
        </div>
      </Card>

      <ManageAvailabilityModal open={modalOpen} onOpenChange={setModalOpen} />
      <NewBookingModal
        open={newBookingOpen}
        onOpenChange={setNewBookingOpen}
        onSave={(b) => {
          if (bookingMode === "edit") {
            onUpdateBooking(b);
          } else {
            onAddBooking(b);
          }
        }}
        initialData={bookingMode === "new" ? undefined : selectedBooking}
        mode={bookingMode}
      />

      <BookingDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        booking={selectedBooking}
        onEdit={(b) => {
          setSelectedBooking(b);
          setBookingMode("edit");
          setDetailsModalOpen(false);
          setNewBookingOpen(true);
        }}
        onDuplicate={(b) => {
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
