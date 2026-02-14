import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { scoutingService } from "@/services/scoutingService";
import { ScoutingEvent } from "@/types/scouting";
import { searchLocations } from "@/components/scouting/map/geocoding";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventToEdit: ScoutingEvent | null;
  onSaved?: () => Promise<void> | void;
};

type EventFormState = {
  name: string;
  event_date: string;
  location: string;
  description: string;
  status: ScoutingEvent["status"];
  start_time: string;
  end_time: string;

  event_type: string;
  casting_for: string;
  looking_for: string;
  min_age: string;
  max_age: string;
  gender_preference: string;
  special_skills: string;
  what_to_bring: string;
  dress_code: string;
  location_details: string;
  virtual_link: string;
  max_attendees: string;
  registration_required: boolean;
  internal_notes: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  targeted_talent_goal: string;
  registration_fee: string;
  expected_attendance: string;
  is_attending: boolean;
  prospects_to_meet: string;
  sync_with_calendar: boolean;
};

const defaultFormState: EventFormState = {
  name: "",
  event_date: "",
  location: "",
  description: "",
  status: "scheduled",
  start_time: "",
  end_time: "",

  event_type: "",
  casting_for: "",
  looking_for: "",
  min_age: "18",
  max_age: "65",
  gender_preference: "all",
  special_skills: "",
  what_to_bring: "",
  dress_code: "",
  location_details: "",
  virtual_link: "",
  max_attendees: "",
  registration_required: false,
  internal_notes: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  targeted_talent_goal: "",
  registration_fee: "",
  expected_attendance: "",
  is_attending: false,
  prospects_to_meet: "",
  sync_with_calendar: false,
};

const parseCommaList = (value: string): string[] | null => {
  const trimmed = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (trimmed.length === 0) return null;
  return trimmed;
};

const toNumberOrNull = (value: string): number | null => {
  const v = value.trim();
  if (!v) return null;
  const parsed = Number(v);
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

const stepMeta: Array<{
  key: 0 | 1 | 2 | 3;
  label: string;
  tint: string;
  border: string;
  text: string;
  dot: string;
}> = [
  {
    key: 0,
    label: "Basics",
    tint: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-900",
    dot: "bg-sky-500",
  },
  {
    key: 1,
    label: "Event details",
    tint: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-900",
    dot: "bg-indigo-500",
  },
  {
    key: 2,
    label: "Registration",
    tint: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-900",
    dot: "bg-violet-500",
  },
  {
    key: 3,
    label: "Tracking",
    tint: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
    dot: "bg-emerald-500",
  },
];

const statusMeta: Record<
  ScoutingEvent["status"],
  { label: string; dot: string; chip: string }
> = {
  draft: {
    label: "Draft",
    dot: "bg-gray-400",
    chip: "bg-gray-50 text-gray-700 border-gray-200",
  },
  scheduled: {
    label: "Scheduled",
    dot: "bg-blue-500",
    chip: "bg-blue-50 text-blue-700 border-blue-200",
  },
  published: {
    label: "Published",
    dot: "bg-indigo-500",
    chip: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

export const ScoutingEventModal = ({
  open,
  onOpenChange,
  eventToEdit,
  onSaved,
}: Props) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [form, setForm] = useState<EventFormState>(defaultFormState);

  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationResults, setLocationResults] = useState<
    { name: string; lat: number; lng: number }[]
  >([]);

  const title = useMemo(() => {
    return eventToEdit ? "Edit Event" : "Create Event";
  }, [eventToEdit]);

  useEffect(() => {
    if (!open) return;

    if (!eventToEdit) {
      setForm(defaultFormState);
      setStep(0);
      setLocationSearch("");
      setLocationOpen(false);
      return;
    }

    setForm({
      name: eventToEdit.name || "",
      event_date: eventToEdit.event_date
        ? new Date(eventToEdit.event_date).toISOString().slice(0, 10)
        : "",
      location: eventToEdit.location || "",
      description: eventToEdit.description || "",
      status: eventToEdit.status || "scheduled",
      start_time: eventToEdit.start_time || "",
      end_time: eventToEdit.end_time || "",

      event_type: eventToEdit.event_type || "",
      casting_for: eventToEdit.casting_for || "",
      looking_for: (eventToEdit.looking_for || []).join(", "),
      min_age:
        typeof eventToEdit.min_age === "number"
          ? String(eventToEdit.min_age)
          : "",
      max_age:
        typeof eventToEdit.max_age === "number"
          ? String(eventToEdit.max_age)
          : "",
      gender_preference: eventToEdit.gender_preference || "all",
      special_skills: eventToEdit.special_skills || "",
      what_to_bring: eventToEdit.what_to_bring || "",
      dress_code: eventToEdit.dress_code || "",
      location_details: eventToEdit.location_details || "",
      virtual_link: eventToEdit.virtual_link || "",
      max_attendees:
        typeof eventToEdit.max_attendees === "number"
          ? String(eventToEdit.max_attendees)
          : "",
      registration_required: Boolean(eventToEdit.registration_required),
      internal_notes: eventToEdit.internal_notes || "",
      contact_name: eventToEdit.contact_name || "",
      contact_email: eventToEdit.contact_email || "",
      contact_phone: eventToEdit.contact_phone || "",
      targeted_talent_goal:
        typeof eventToEdit.targeted_talent_goal === "number"
          ? String(eventToEdit.targeted_talent_goal)
          : "",
      registration_fee:
        typeof eventToEdit.registration_fee === "number"
          ? String(eventToEdit.registration_fee)
          : "",
      expected_attendance:
        typeof eventToEdit.expected_attendance === "number"
          ? String(eventToEdit.expected_attendance)
          : "",
      is_attending: Boolean(eventToEdit.is_attending),
      prospects_to_meet: (eventToEdit.prospects_to_meet || []).join(", "),
      sync_with_calendar: Boolean(eventToEdit.sync_with_calendar),
    });

    setLocationSearch(eventToEdit.location || "");
    setStep(0);
  }, [eventToEdit, open]);

  useEffect(() => {
    if (!open) return;

    const run = async () => {
      if (!locationOpen) return;
      if (locationSearch.trim().length < 3) {
        setLocationResults([]);
        return;
      }

      const results = await searchLocations(locationSearch);
      setLocationResults(results);
    };

    const debounce = setTimeout(run, 350);
    return () => clearTimeout(debounce);
  }, [locationOpen, locationSearch, open]);

  const onClose = () => {
    if (isSaving) return;
    onOpenChange(false);
  };

  const handleSave = async () => {
    try {
      if (isSaving) return;
      setIsSaving(true);

      const agencyId = await scoutingService.getUserAgencyId();
      if (!agencyId) {
        toast({
          title: "Error",
          description: "Could not determine agency.",
          variant: "destructive",
        });
        return;
      }

      if (!form.name || !form.event_date || !form.location) {
        toast({
          title: "Missing fields",
          description: "Name, date, and location are required.",
          variant: "destructive",
        });
        return;
      }

      const payload: Partial<ScoutingEvent> = {
        name: form.name.trim(),
        event_date: form.event_date
          ? new Date(form.event_date).toISOString()
          : null,
        location: form.location.trim(),
        description: form.description.trim() || null,
        status: form.status,
        start_time: form.start_time.trim() || null,
        end_time: form.end_time.trim() || null,

        event_type: form.event_type || null,
        casting_for: form.casting_for || null,
        looking_for: parseCommaList(form.looking_for),
        min_age: toNumberOrNull(form.min_age),
        max_age: toNumberOrNull(form.max_age),
        gender_preference: form.gender_preference || null,
        special_skills: form.special_skills || null,
        what_to_bring: form.what_to_bring || null,
        dress_code: form.dress_code || null,
        location_details: form.location_details || null,
        virtual_link: form.virtual_link || null,
        max_attendees: toNumberOrNull(form.max_attendees),
        registration_required: form.registration_required,
        internal_notes: form.internal_notes || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        targeted_talent_goal: toNumberOrNull(form.targeted_talent_goal),
        registration_fee:
          form.registration_required && form.registration_fee.trim()
            ? Number(form.registration_fee)
            : null,
        expected_attendance: toNumberOrNull(form.expected_attendance),
        is_attending: form.is_attending,
        prospects_to_meet: parseCommaList(form.prospects_to_meet),
        sync_with_calendar: form.sync_with_calendar,
      };

      if (eventToEdit?.id) {
        await scoutingService.updateEvent(eventToEdit.id, payload);
        toast({ title: "Event updated" });
      } else {
        await scoutingService.createEvent(
          payload as Omit<ScoutingEvent, "id" | "created_at" | "updated_at">,
        );
        toast({ title: "Event created" });
      }

      await onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to save event.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-500 font-medium">
            Manage open calls and casting events for your scouting pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-slate-50 to-white p-2 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {stepMeta.map((s, idx) => {
                const isActive = step === s.key;
                const isDone = step > s.key;

                return (
                  <React.Fragment key={s.key}>
                    <button
                      type="button"
                      onClick={() => setStep(s.key)}
                      className={cn(
                        "group flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-colors",
                        isActive
                          ? `${s.tint} ${s.border} ${s.text}`
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex items-center justify-center h-5 w-5 rounded-full text-[11px] border",
                          isActive
                            ? `${s.dot} text-white border-transparent`
                            : isDone
                              ? "bg-gray-900 text-white border-transparent"
                              : "bg-white text-gray-700 border-gray-200",
                        )}
                      >
                        {s.key + 1}
                      </span>
                      <span className="whitespace-nowrap">{s.label}</span>
                    </button>

                    {idx < stepMeta.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            {step === 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900">Basics</h3>
                <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/40 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Name
                      </Label>
                      <Input
                        value={form.name}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="Event name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Date
                      </Label>
                      <Input
                        type="date"
                        value={form.event_date}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, event_date: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Status
                      </Label>
                      <Select
                        value={form.status}
                        onValueChange={(v) =>
                          setForm((p) => ({ ...p, status: v as any }))
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "h-10",
                            "border",
                            statusMeta[form.status].chip,
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2.5 w-2.5 rounded-full",
                                statusMeta[form.status].dot,
                              )}
                            />
                            <span className="text-sm font-bold">
                              {statusMeta[form.status].label}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.keys(statusMeta) as ScoutingEvent["status"][]
                          ).map((s) => (
                            <SelectItem key={s} value={s}>
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    statusMeta[s].dot,
                                  )}
                                />
                                <span className="font-semibold">
                                  {statusMeta[s].label}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Start time
                      </Label>
                      <Input
                        value={form.start_time}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, start_time: e.target.value }))
                        }
                        placeholder="09:00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        End time
                      </Label>
                      <Input
                        value={form.end_time}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, end_time: e.target.value }))
                        }
                        placeholder="18:00"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Location
                      </Label>
                      <div className="relative">
                        <Input
                          value={locationSearch}
                          onFocus={() => setLocationOpen(true)}
                          onBlur={() =>
                            setTimeout(() => setLocationOpen(false), 150)
                          }
                          onChange={(e) => {
                            setLocationSearch(e.target.value);
                            setForm((p) => ({
                              ...p,
                              location: e.target.value,
                            }));
                          }}
                          placeholder="Search a city, venue, or address"
                        />
                        <p className="mt-1 text-xs text-gray-500 font-medium">
                          Type 3+ characters to search.
                        </p>
                        {locationOpen && locationResults.length > 0 && (
                          <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-md overflow-hidden">
                            <div className="max-h-56 overflow-auto">
                              {locationResults.map((r) => (
                                <button
                                  key={`${r.name}-${r.lat}-${r.lng}`}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setLocationSearch(r.name);
                                    setForm((p) => ({
                                      ...p,
                                      location: r.name,
                                    }));
                                    setLocationOpen(false);
                                  }}
                                >
                                  {r.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Description
                      </Label>
                      <Textarea
                        value={form.description}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Optional details"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Event details
                </h3>
                <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Event type
                      </Label>
                      <Select
                        value={form.event_type || ""}
                        onValueChange={(v) =>
                          setForm((p) => ({ ...p, event_type: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Open Call">Open Call</SelectItem>
                          <SelectItem value="Casting">Casting</SelectItem>
                          <SelectItem value="Meet & Greet">
                            Meet & Greet
                          </SelectItem>
                          <SelectItem value="Test Shoot">Test Shoot</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Casting for
                      </Label>
                      <Input
                        value={form.casting_for}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            casting_for: e.target.value,
                          }))
                        }
                        placeholder="Brand / project / role"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Looking for
                      </Label>
                      <Input
                        value={form.looking_for}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            looking_for: e.target.value,
                          }))
                        }
                        placeholder="Comma-separated (e.g. Model, Actor, UGC Creator)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Min age
                      </Label>
                      <Input
                        type="number"
                        min={18}
                        max={65}
                        value={form.min_age}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, min_age: e.target.value }))
                        }
                        placeholder="18"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Max age
                      </Label>
                      <Input
                        type="number"
                        min={18}
                        max={65}
                        value={form.max_age}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, max_age: e.target.value }))
                        }
                        placeholder="65"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Gender preference
                      </Label>
                      <Select
                        value={form.gender_preference}
                        onValueChange={(v) =>
                          setForm((p) => ({ ...p, gender_preference: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="nonbinary">Non-binary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Virtual link
                      </Label>
                      <Input
                        value={form.virtual_link}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            virtual_link: e.target.value,
                          }))
                        }
                        placeholder="https://..."
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Location details
                      </Label>
                      <Textarea
                        value={form.location_details}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            location_details: e.target.value,
                          }))
                        }
                        placeholder="Parking, room number, entry instructions..."
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Special skills
                      </Label>
                      <Textarea
                        value={form.special_skills}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            special_skills: e.target.value,
                          }))
                        }
                        placeholder="Any requirements or skills"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-bold text-gray-700">
                        What to bring
                      </Label>
                      <Textarea
                        value={form.what_to_bring}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            what_to_bring: e.target.value,
                          }))
                        }
                        placeholder="Items to bring"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Dress code
                      </Label>
                      <Textarea
                        value={form.dress_code}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, dress_code: e.target.value }))
                        }
                        placeholder="Optional dress code"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Registration & contact
                </h3>
                <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Registration required
                      </Label>
                      <div className="flex items-center gap-3 h-9">
                        <Switch
                          checked={form.registration_required}
                          onCheckedChange={(checked) =>
                            setForm((p) => ({
                              ...p,
                              registration_required: checked,
                            }))
                          }
                        />
                        <span className="text-sm text-gray-600">
                          {form.registration_required ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Max attendees
                      </Label>
                      <Input
                        value={form.max_attendees}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            max_attendees: e.target.value,
                          }))
                        }
                        placeholder="Optional"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Registration fee
                      </Label>
                      {form.registration_required ? (
                        <Input
                          value={form.registration_fee}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              registration_fee: e.target.value,
                            }))
                          }
                          placeholder="0"
                        />
                      ) : (
                        <div className="h-9 flex items-center text-sm font-medium text-gray-500">
                          Enable registration to set a fee.
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Targeted talent goal
                      </Label>
                      <Input
                        value={form.targeted_talent_goal}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            targeted_talent_goal: e.target.value,
                          }))
                        }
                        placeholder="Optional"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Contact name
                      </Label>
                      <Input
                        value={form.contact_name}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            contact_name: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Contact email
                      </Label>
                      <Input
                        value={form.contact_email}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            contact_email: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Contact phone
                      </Label>
                      <Input
                        value={form.contact_phone}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            contact_phone: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900">Tracking</h3>
                <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Expected attendance
                      </Label>
                      <Input
                        value={form.expected_attendance}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            expected_attendance: e.target.value,
                          }))
                        }
                        placeholder="Optional"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Is attending
                      </Label>
                      <div className="flex items-center gap-3 h-9">
                        <Switch
                          checked={form.is_attending}
                          onCheckedChange={(checked) =>
                            setForm((p) => ({ ...p, is_attending: checked }))
                          }
                        />
                        <span className="text-sm text-gray-600">
                          {form.is_attending ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Prospects to meet
                      </Label>
                      <Input
                        value={form.prospects_to_meet}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            prospects_to_meet: e.target.value,
                          }))
                        }
                        placeholder="Comma-separated names"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Sync with calendar
                      </Label>
                      <div className="flex items-center gap-3 h-9">
                        <Switch
                          checked={form.sync_with_calendar}
                          onCheckedChange={(checked) =>
                            setForm((p) => ({
                              ...p,
                              sync_with_calendar: checked,
                            }))
                          }
                        />
                        <span className="text-sm text-gray-600">
                          {form.sync_with_calendar ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Internal notes
                      </Label>
                      <Textarea
                        value={form.internal_notes}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            internal_notes: e.target.value,
                          }))
                        }
                        placeholder="Only visible to your team"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(0, s - 1) as any)}
                disabled={isSaving || step === 0}
              >
                Back
              </Button>
              {step < 3 ? (
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  onClick={() => setStep((s) => Math.min(3, s + 1) as any)}
                  disabled={isSaving}
                >
                  Next
                </Button>
              ) : (
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
