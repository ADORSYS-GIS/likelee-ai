import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import {
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  MapPin,
  Plus,
  Search,
  Tag,
  Upload,
  File as FileIcon,
  User,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { parseBackendError } from "@/utils/errorParser";
import {
  getAgencyRoster,
  getAgencyTalents,
  getAgencyClients,
  getAgencyCalendlySettings,
  createAgencyClient,
  createBookingWithFiles,
  getBookingsCampaigns,
  sendBookingCreatedEmail,
} from "@/api/functions";
import { CampaignModal } from "./CampaignModal";
import { buildCalendlyBookingUrl } from "@/utils/bookDemo";

const CALENDLY_WIDGET_SCRIPT_ID = "calendly-widget-script";
const CALENDLY_WIDGET_STYLESHEET_ID = "calendly-widget-stylesheet";

export const NewBookingModal = ({
  open,
  onOpenChange,
  onSave,
  initialData,
  mode = "new",
  isSportsAgency = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (booking: any) => void;
  initialData?: any;
  mode?: "new" | "edit" | "duplicate";
  isSportsAgency?: boolean;
}) => {
  const { toast } = useToast();
  const entitySingularTitle = isSportsAgency ? "Athlete" : "Talent";
  const entitySingularLower = isSportsAgency ? "athlete" : "talent";

  const getBookingCreateErrorMessage = (err: any) => {
    const body = err?.response?.data || err?.data;
    const code =
      body?.code ||
      body?.error_code ||
      body?.error?.code ||
      err?.code ||
      err?.error?.code;
    if (String(code || "").trim() === "PGRST204") {
      return "There was an issue processing your booking. Please verify your details and try again.";
    }

    const raw =
      (typeof body === "string" && body) ||
      (typeof err === "string" ? err : err?.message) ||
      "";
    if (/Error parsing multipart\/form-data request/i.test(String(raw))) {
      return "We couldn't read the booking form upload. Please try again. If it keeps failing, remove attachments and retry.";
    }

    const parsed = parseBackendError(err);
    if (parsed && /\bPGRST204\b/i.test(parsed)) {
      return "There was an issue processing your booking. Please verify your details and try again.";
    }
    return parsed;
  };
  const [talents, setTalents] = useState<any[]>([]);
  const [talentsLoading, setTalentsLoading] = useState(false);
  const [bookingType, setBookingType] = useState("confirmed");
  const [multiTalent, setMultiTalent] = useState(false);
  const [talentSearch, setTalentSearch] = useState("");
  const [selectedTalents, setSelectedTalents] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [newClient, setNewClient] = useState({
    company: "",
    contact: "",
    email: "",
    phone: "",
    terms: "Net 30",
    industry: "",
  });
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [allDay, setAllDay] = useState(false);
  const [callTime, setCallTime] = useState("09:00");
  const [wrapTime, setWrapTime] = useState("17:00");
  const [location, setLocation] = useState("");
  const [locationNotes, setLocationNotes] = useState("");
  const [rate, setRate] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [rateType, setRateType] = useState("day");
  const [usageTerms, setUsageTerms] = useState("");
  const [usageDuration, setUsageDuration] = useState("1");
  const [exclusive, setExclusive] = useState(false);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    calendar: false,
  });
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [calendlyEmbedOpen, setCalendlyEmbedOpen] = useState(false);
  const [calendlyEmbedUrl, setCalendlyEmbedUrl] = useState("");
  const [calendlySchedulingUrl, setCalendlySchedulingUrl] = useState("");
  const calendlyEmbedContainerRef = useRef<HTMLDivElement | null>(null);
  const [calendlyEmbedLoadError, setCalendlyEmbedLoadError] = useState("");
  const [isCalendlyConfigured, setIsCalendlyConfigured] = useState(false);
  const [isCalendlyConfigLoading, setIsCalendlyConfigLoading] = useState(false);
  const [calendlyConfigMessage, setCalendlyConfigMessage] = useState(
    "Set up Calendly in Agency Settings > Integrations before enabling calendar invites and reminders.",
  );
  const useCalendlyHandoff = notifications.calendar;

  useEffect(() => {
    if (!calendlyEmbedOpen || !calendlyEmbedUrl) return;

    let cancelled = false;

    const ensureCalendlyStylesheet = () => {
      if (
        document.getElementById(CALENDLY_WIDGET_STYLESHEET_ID) ||
        document.querySelector(
          'link[href="https://assets.calendly.com/assets/external/widget.css"]',
        )
      ) {
        return;
      }

      const link = document.createElement("link");
      link.id = CALENDLY_WIDGET_STYLESHEET_ID;
      link.rel = "stylesheet";
      link.href = "https://assets.calendly.com/assets/external/widget.css";
      document.head.appendChild(link);
    };

    const mountCalendlyWidget = () => {
      const container = calendlyEmbedContainerRef.current;
      const calendlyApi = (window as any).Calendly;
      if (!container || !calendlyApi?.initInlineWidget) return false;

      container.innerHTML = "";
      calendlyApi.initInlineWidget({
        url: calendlyEmbedUrl,
        parentElement: container,
      });
      return true;
    };

    const ensureCalendlyScript = async () => {
      ensureCalendlyStylesheet();
      setCalendlyEmbedLoadError("");

      if (mountCalendlyWidget()) return;

      const existingScript = document.getElementById(
        CALENDLY_WIDGET_SCRIPT_ID,
      ) as HTMLScriptElement | null;

      const loadScript = () =>
        new Promise<void>((resolve, reject) => {
          const script = existingScript || document.createElement("script");
          script.id = CALENDLY_WIDGET_SCRIPT_ID;
          script.src = "https://assets.calendly.com/assets/external/widget.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Failed to load the Calendly widget."));
          if (!existingScript) {
            document.body.appendChild(script);
          }
        });

      try {
        await loadScript();
        if (cancelled) return;
        if (!mountCalendlyWidget()) {
          throw new Error("Calendly widget is unavailable.");
        }
      } catch (error: any) {
        if (cancelled) return;
        setCalendlyEmbedLoadError(
          error?.message || "Failed to load the Calendly widget.",
        );
      }
    };

    void ensureCalendlyScript();

    return () => {
      cancelled = true;
      if (calendlyEmbedContainerRef.current) {
        calendlyEmbedContainerRef.current.innerHTML = "";
      }
    };
  }, [calendlyEmbedOpen, calendlyEmbedUrl]);

  useEffect(() => {
    if (!calendlyEmbedOpen) return;

    const handleCalendlyMessage = (event: MessageEvent) => {
      const origin = String(event.origin || "");
      if (!origin.includes("calendly.com")) return;

      const payload = event.data;
      const calendlyEventName =
        typeof payload?.event === "string" ? payload.event : "";

      if (calendlyEventName !== "calendly.event_scheduled") return;

      setCalendlyEmbedOpen(false);
      setCalendlyEmbedUrl("");
      setCalendlyEmbedLoadError("");
      toast({
        title: "Meeting scheduled",
        description:
          "The Calendly booking is complete and the scheduling window has been closed.",
      });
    };

    window.addEventListener("message", handleCalendlyMessage);
    return () => {
      window.removeEventListener("message", handleCalendlyMessage);
    };
  }, [calendlyEmbedOpen, toast]);

  // When all-day is enabled, normalize times to full-day window
  useEffect(() => {
    if (allDay) {
      setCallTime("00:00");
      setWrapTime("23:59");
    }
  }, [allDay]);

  // Load talents when modal opens
  useEffect(() => {
    const loadTalents = async () => {
      if (!open) return;
      setTalentsLoading(true);
      try {
        // Bookings are IRL-only — only agency-created talents (agency_users rows)
        // can be booked. Independent connected creators (relationship_type='marketplace_connected')
        // don't have agency_users rows and cannot be booked.
        const resp = await getAgencyTalents();
        const rows = Array.isArray(resp)
          ? resp
          : Array.isArray((resp as any)?.talents)
            ? (resp as any).talents
            : Array.isArray((resp as any)?.data?.talents)
              ? (resp as any).data.talents
              : [];
        const mapped = Array.isArray(rows)
          ? rows
              .filter((r: any) =>
                // Only include agency-created talents — those with agency_users rows.
                // relationship_type='internal' means the talent was created by this agency.
                // relationship_type='marketplace_connected' means independent creator — skip.
                !r.relationship_type || r.relationship_type === "internal"
              )
              .map((r: any) => ({
                id: r.agency_user_id || r.id,
                name: r.full_name || r.name || "Unnamed",
                img: r.img || r.profile_photo_url || null,
                creator_id: r.creator_id || null,
                relationship_id: r.relationship_id || null,
                relationship_type: r.relationship_type || "internal",
                contract_controlled: Boolean(r.contract_controlled),
              }))
          : [];
        setTalents(mapped);
      } catch (_e) {
        setTalents([]);
      } finally {
        setTalentsLoading(false);
      }
    };
    loadTalents();
  }, [open]);

  // Load clients when modal opens
  useEffect(() => {
    const loadClients = async () => {
      if (!open) return;
      try {
        const rows = await getAgencyClients();
        const mapped = Array.isArray(rows)
          ? rows.map((r: any) => ({
              id: r.id,
              company: r.company,
              contact: r.contact_name || "",
              email: r.email || "",
              phone: r.phone || "",
              terms: r.terms || "Net 30",
              industry: r.industry || "",
              // Defaults to satisfy UI typing used elsewhere
              industryTags: [],
              revenue: 0,
              bookings_count: 0,
            }))
          : [];
        if (mapped.length > 0) setClients(mapped);
      } catch (_e) {}
    };
    loadClients();
  }, [open]);

  // Load campaigns when modal opens
  useEffect(() => {
    const loadCampaigns = async () => {
      if (!open) return;
      try {
        const rows = await getBookingsCampaigns();
        setCampaigns(Array.isArray(rows) ? rows : []);
      } catch (_e) {}
    };
    loadCampaigns();
  }, [open]);

  useEffect(() => {
    const loadCalendlySettings = async () => {
      if (!open) return;
      setIsCalendlyConfigLoading(true);
      try {
        const response = await getAgencyCalendlySettings();
        const settings = response?.data || {};
        const schedulingUrl = String(settings?.scheduling_url || "").trim();
        const integrationEnabled = settings?.is_enabled !== false;
        const configured = Boolean(schedulingUrl) && integrationEnabled;

        setCalendlySchedulingUrl(schedulingUrl);
        setIsCalendlyConfigured(configured);
        setCalendlyConfigMessage(
          configured
            ? ""
            : "Set up Calendly in Agency Settings > Integrations and save the public scheduling link before enabling calendar invites and reminders.",
        );

        if (!configured) {
          setNotifications((previous) => ({
            ...previous,
            calendar: false,
          }));
        }
      } catch (_error) {
        setCalendlySchedulingUrl("");
        setIsCalendlyConfigured(false);
        setCalendlyConfigMessage(
          "Calendly is not ready yet. Go to Agency Settings > Integrations, enable Calendly, and save the public scheduling link before turning this on.",
        );
        setNotifications((previous) => ({
          ...previous,
          calendar: false,
        }));
      } finally {
        setIsCalendlyConfigLoading(false);
      }
    };

    loadCalendlySettings();
  }, [open]);

  // Pre-fill data for Edit or Duplicate modes
  useEffect(() => {
    if (open && initialData) {
      setBookingType(
        initialData.type || initialData.booking_type || "confirmed",
      );
      setDate(initialData.date || format(new Date(), "yyyy-MM-dd"));
      setNotes(initialData.notes || "");

      if (typeof initialData.all_day === "boolean") {
        setAllDay(initialData.all_day);
      }
      if (initialData.call_time || initialData.callTime) {
        setCallTime(initialData.call_time || initialData.callTime);
      }
      if (initialData.wrap_time || initialData.wrapTime) {
        setWrapTime(initialData.wrap_time || initialData.wrapTime);
      }

      // Try to find talent in current talents list
      const preTalentId = initialData.talent_id || initialData.talentId;
      const preTalentName = initialData.talent_name || initialData.talentName;
      const talent =
        (preTalentId
          ? talents.find((t: any) => String(t.id) === String(preTalentId))
          : undefined) || talents.find((t: any) => t.name === preTalentName);
      if (talent) setSelectedTalents([talent]);

      // Try to find client in clients
      const preClientId = initialData.client_id || initialData.clientId;
      const preClientName = initialData.client_name || initialData.clientName;
      const client =
        (preClientId
          ? clients.find((c) => String(c.id) === String(preClientId))
          : undefined) || clients.find((c) => c.company === preClientName);
      if (client) setSelectedClient(client);

      setMultiTalent(false);
    } else if (open && !initialData) {
      setBookingType("confirmed");
      setMultiTalent(false);
      setSelectedTalents([]);
      setSelectedClient(null);
      setNotes("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setSelectedCampaign(null);
      setNotifications({
        email: true,
        sms: false,
        push: true,
        calendar: false,
      });
    }
  }, [open, initialData, clients, talents, campaigns]);

  const handleCalendarToggle = (checked: boolean) => {
    if (checked && !isCalendlyConfigured) {
      toast({
        title: "Set up Calendly first",
        description:
          calendlyConfigMessage ||
          "Go to Agency Settings > Integrations and complete the Calendly setup before enabling calendar invites and reminders.",
        variant: "destructive" as any,
      });
      setNotifications((previous) => ({
        ...previous,
        calendar: false,
      }));
      return;
    }

    setNotifications((previous) => ({
      ...previous,
      calendar: checked,
    }));
  };

  // Server-side filtering of talents via q param
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!open) return;
      setTalentsLoading(true);
      try {
        const resp = await getAgencyTalents({ q: talentSearch || undefined });
        if (cancelled) return;
        const rows = Array.isArray(resp)
          ? resp
          : Array.isArray((resp as any)?.talents)
            ? (resp as any).talents
            : Array.isArray((resp as any)?.data?.talents)
              ? (resp as any).data.talents
              : [];
        const mapped = Array.isArray(rows)
          ? rows
              .filter((r: any) =>
                !r.relationship_type || r.relationship_type === "internal"
              )
              .map((r: any) => ({
                id: r.agency_user_id || r.id,
                name: r.full_name || r.name || "Unnamed",
                img: r.img || r.profile_photo_url || null,
                creator_id: r.creator_id || null,
                relationship_id: r.relationship_id || null,
                relationship_type: r.relationship_type || "internal",
                contract_controlled: Boolean(r.contract_controlled),
              }))
          : [];
        setTalents(mapped);
      } catch (_e) {
        if (!cancelled) setTalents([]);
      } finally {
        if (!cancelled) setTalentsLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [talentSearch, open]);

  const filteredTalents = talents;

  const filteredClients = clients.filter((c) =>
    c.company.toLowerCase().includes(clientSearch.toLowerCase()),
  );

  const handleSelectTalent = (talent: any) => {
    if (multiTalent) {
      if (!selectedTalents.find((t) => t.id === talent.id)) {
        setSelectedTalents([...selectedTalents, talent]);
      } else {
        setSelectedTalents(selectedTalents.filter((t) => t.id !== talent.id));
      }
    } else {
      setSelectedTalents([talent]);
    }
    setTalentSearch("");
  };

  const handleAddClient = async () => {
    try {
      const created = await createAgencyClient({
        company: newClient.company,
        contact_name: newClient.contact,
        email: newClient.email,
        phone: newClient.phone,
        terms: newClient.terms,
        industry: newClient.industry || undefined,
      });
      const row = Array.isArray(created) ? created[0] : created;
      const client = {
        id: row.id,
        company: row.company,
        contact: row.contact_name || "",
        email: row.email || "",
        phone: row.phone || "",
        terms: row.terms || "Net 30",
        industry: row.industry || newClient.industry || "",
        industryTags: [],
        revenue: 0,
        bookings_count: 0,
      };
      setClients([...clients, client]);
      setSelectedClient(client);
      setShowAddClient(false);
      setClientSearch("");
    } catch (_e) {
      toast({
        title: "Failed to create client",
        description: "Please try again.",
        variant: "destructive" as any,
      });
    }
  };

  const commission = rate * 0.2;
  const todayDateString = format(new Date(), "yyyy-MM-dd");

  const hasTimeMismatch =
    !allDay &&
    Boolean(callTime) &&
    Boolean(wrapTime) &&
    String(callTime) >= String(wrapTime);

  const dateIssue = (() => {
    const s = String(date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return "Date must be in YYYY-MM-DD format";
    }
    const parsed = new Date(`${s}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return "Please select a valid date";
    }
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    if (mode !== "edit" && parsed.getTime() < todayStart.getTime()) {
      return "Booking date can’t be in the past";
    }
    return "";
  })();

  const pastStartTimeIssue = (() => {
    if (mode === "edit" || allDay || !date || !callTime) {
      return "";
    }
    if (date !== todayDateString) {
      return "";
    }

    const [hours, minutes] = String(callTime)
      .split(":")
      .map((value) => Number(value));
    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return "Please select a valid call time";
    }

    const now = new Date();
    const selectedStart = new Date();
    selectedStart.setHours(hours, minutes, 0, 0);
    if (selectedStart.getTime() <= now.getTime()) {
      return "Call time must be in the future for bookings scheduled today";
    }
    return "";
  })();

  const missingInputs = (() => {
    const missing: string[] = [];
    if (selectedTalents.length === 0) missing.push(`${entitySingularTitle}`);
    if (!selectedClient) missing.push("Client");
    if (!selectedCampaign) missing.push("Campaign");
    return missing;
  })();

  const validationIssues = (() => {
    const issues: string[] = [];
    if (missingInputs.length > 0) {
      issues.push(`Select: ${missingInputs.join(", ")}`);
    }
    if (notifications.calendar && selectedTalents.length > 1) {
      issues.push("Calendly booking supports one talent at a time");
    }
    if (dateIssue) {
      issues.push(dateIssue);
    }
    if (pastStartTimeIssue) {
      issues.push(pastStartTimeIssue);
    }
    if (hasTimeMismatch) {
      issues.push("Wrap time must be after call time");
    }
    return issues;
  })();

  const canSubmit = !saving && validationIssues.length === 0;

  // Shared submit routine for Save button and Preview -> Confirm
  const submitBookings = async () => {
    if (!canSubmit) {
      if (validationIssues.length > 0) {
        toast({
          title: "Fix required fields",
          description: validationIssues.join(" • "),
          variant: "destructive" as any,
        });
      }
      return;
    }

    // Require campaign selection
    if (!selectedCampaign) {
      toast({
        title: "Campaign Required",
        description: "Please select a campaign before creating a booking.",
        variant: "destructive" as any,
      });
      return;
    }

    setSaving(true);
    try {
      let calendlyUrlAfterSave = "";
      if (useCalendlyHandoff) {
        const schedulingUrl = calendlySchedulingUrl.trim();
        if (!schedulingUrl) {
          toast({
            title: "Calendly link required",
            description:
              "Save the public Calendly scheduling link in Agency Settings > Integrations before using calendar booking.",
            variant: "destructive" as any,
          });
          return;
        }

        calendlyUrlAfterSave = buildCalendlyBookingUrl(
          schedulingUrl,
          "agency_booking_modal",
          {
            companyName: selectedClient?.company,
            userName:
              selectedClient?.contact ||
              selectedClient?.company ||
              selectedTalents[0]?.name,
            workEmail: selectedClient?.email,
            phoneNumber: selectedClient?.phone,
          },
        );

        setPreviewOpen(false);
        onOpenChange(false);
        toast({
          title: "Saving booking",
          description:
            "Email and in-app notifications are being processed. Calendly will open next.",
        });
      }

      const bookingRequests = selectedTalents.map(async (talent) => {
        const payload: any = {
          booking_type: bookingType,
          status: "pending",
          client_id: selectedClient?.id,
          talent_id: talent.id,
          creator_id: talent.creator_id || undefined,
          relationship_id: talent.relationship_id || undefined,
          talent_name: talent.name,
          client_name: selectedClient.company,
          date: date,
          all_day: allDay,
          call_time: allDay ? "00:00" : callTime,
          wrap_time: allDay ? "23:59" : wrapTime,
          location: location.trim() || undefined,
          location_notes: locationNotes.trim() || undefined,
          rate_cents: rate > 0 ? Math.round(rate * 100) : undefined,
          currency: currency,
          rate_type: rateType,
          usage_terms: usageTerms || undefined,
          usage_duration: usageDuration || undefined,
          exclusive: exclusive,
          notes: notes || undefined,
          notify_email: notifications.email,
          notify_sms: false,
          notify_push: true,
          notify_calendar: false,
          campaign_id: selectedCampaign?.id,
        };

        const created = await createBookingWithFiles(payload, files);
        const row = Array.isArray(created) ? created[0] : created;
        return { row, payload, talent };
      });

      const createdBookings = await Promise.all(bookingRequests);

      createdBookings.forEach(({ row, payload }) => {
        if (!row) return;
        const normalized = {
          ...row,
          status: row.status || payload.status,
          type: row.type || payload.booking_type,
          date: row.date || payload.date,
          talent_id: row.talent_id || payload.talent_id,
          talent_name: row.talent_name || payload.talent_name,
          client_id: row.client_id || payload.client_id,
          client_name: row.client_name || payload.client_name,
        };
        onSave(normalized);
      });

      void (async () => {
        const notificationResults = await Promise.allSettled(
          createdBookings
            .filter(({ row }) => Boolean(row?.id))
            .map(({ row }) => sendBookingCreatedEmail(row.id)),
        );

        const firstFailure = notificationResults.find(
          (result) => result.status === "rejected",
        );
        if (!firstFailure) return;

        const message =
          (firstFailure as PromiseRejectedResult).reason?.message ||
          "Some booking notifications could not be sent.";
        toast({
          title: "Booking saved with notification issues",
          description: message,
          variant: "destructive" as any,
        });
      })();

      setUploadSuccess(true);
      toast({
        title: "Booking Created",
        description: `Scheduled ${bookingType} for ${selectedTalents
          .map((t) => t.name)
          .join(", ")} on ${date}.`,
      });
      if (useCalendlyHandoff) {
        setCalendlyEmbedUrl(calendlyUrlAfterSave);
        setCalendlyEmbedOpen(true);
        toast({
          title: "Continue in Calendly",
          description:
            "The booking was saved. Complete the calendar invite and reminders in Calendly.",
        });
        return;
      }
      setTimeout(() => onOpenChange(false), 800);
    } catch (e: any) {
      const status = e?.status || e?.response?.status || e?.statusCode;
      const msg = getBookingCreateErrorMessage(e) || "Failed to create booking";
      const isUnavailable =
        status === 409 ||
        /409/.test(String(msg)) ||
        /unavailable/i.test(String(msg));
      if (isUnavailable) {
        toast({
          title: `${entitySingularTitle} unavailable`,
          description: `This ${entitySingularLower} is booked out during the selected date. Please choose another date or ${entitySingularLower}.`,
          variant: "destructive" as any,
        });
      } else {
        toast({
          title: "Failed to create booking",
          description: msg,
          variant: "destructive" as any,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {mode === "edit" ? "Edit Booking" : "New Booking"}
            </DialogTitle>
            <p className="text-sm text-gray-500">
              {mode === "edit"
                ? "Update details for this booking"
                : `Schedule a booking for your ${entitySingularLower}`}
            </p>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Booking Type *</Label>
              <div className="flex gap-2">
                <Select value={bookingType} onValueChange={setBookingType}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casting">Casting</SelectItem>
                    <SelectItem value="option">Option</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="test-shoot">Test shoot</SelectItem>
                    <SelectItem value="fitting">Fitting</SelectItem>
                    <SelectItem value="rehearsal">Rehearsal</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="text-green-600 border-green-200 bg-green-50"
                  onClick={() => setPreviewOpen(true)}
                  disabled={!canSubmit}
                >
                  Preview
                </Button>
                {uploadSuccess && (
                  <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Files uploaded
                  </span>
                )}
              </div>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {files.map((f, idx) => (
                    <div
                      key={`${f.name}-${idx}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 text-xs text-gray-700 bg-white"
                      title={f.name}
                    >
                      <FileIcon className="w-3.5 h-3.5 text-gray-500" />
                      <span className="max-w-[180px] truncate">{f.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>{`${entitySingularTitle} *`}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="multi"
                    checked={multiTalent}
                    onChange={(e) => {
                      setMultiTalent(e.target.checked);
                      if (!e.target.checked && selectedTalents.length > 1) {
                        setSelectedTalents([selectedTalents[0]]);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="multi" className="text-sm text-gray-600">
                    {`Book multiple ${entitySingularLower}`}
                  </label>
                </div>
              </div>
              <div className="relative">
                <Input
                  placeholder={`Search ${entitySingularLower} by name...`}
                  value={talentSearch}
                  onChange={(e) => setTalentSearch(e.target.value)}
                />
              </div>

              <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-white">
                {talentsLoading ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{`Loading ${entitySingularLower}...`}</span>
                    </div>
                  </div>
                ) : (
                  filteredTalents.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTalent(t)}
                      className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${
                        selectedTalents.find((st) => st.id === t.id)
                          ? "bg-indigo-50/50"
                          : ""
                      }`}
                    >
                      {t.img ? (
                        <img
                          src={t.img}
                          className="w-10 h-10 rounded-full object-cover border border-gray-100"
                          alt={t.name}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">
                          {t.name}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <p className="text-xs text-green-600 font-medium lowercase">
                            available
                          </p>
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded leading-none lowercase">
                            {t.relationship_type === "marketplace_connected"
                              ? "Connected"
                              : "Internal Talent"}
                          </span>
                        </div>
                      </div>
                      {selectedTalents.find((st) => st.id === t.id) && (
                        <div className="text-indigo-600">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {!talentsLoading && filteredTalents.length === 0 && (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    {talentSearch
                      ? `No ${entitySingularLower} found matching "${talentSearch}"`
                      : `No ${entitySingularLower} found`}
                  </div>
                )}
              </div>

              <div className="space-y-2 mt-2">
                {selectedTalents.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2 bg-indigo-50 border border-indigo-100 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {t.img ? (
                        <img
                          src={t.img}
                          className="w-8 h-8 rounded-full"
                          alt={t.name}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                      <p className="text-sm font-bold text-indigo-900">
                        Selected: {t.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded leading-none lowercase">
                        {t.relationship_type === "marketplace_connected"
                          ? "Connected"
                          : "Internal Talent"}
                      </span>
                      <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded leading-none uppercase">
                        Available
                      </span>
                      <button
                        onClick={() =>
                          setSelectedTalents(
                            selectedTalents.filter((st) => st.id !== t.id),
                          )
                        }
                        className="text-indigo-400 hover:text-indigo-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Client *</Label>
              {showAddClient ? (
                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <Building2 className="w-4 h-4" /> New Client
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Company Name *</Label>
                      <Input
                        placeholder="Acme Inc."
                        value={newClient.company}
                        onChange={(e) =>
                          setNewClient({
                            ...newClient,
                            company: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Industry</Label>
                      <Input
                        placeholder="e.g. Fashion, Retail, Media"
                        value={newClient.industry}
                        onChange={(e) =>
                          setNewClient({
                            ...newClient,
                            industry: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Contact Name *</Label>
                      <Input
                        placeholder="John Doe"
                        value={newClient.contact}
                        onChange={(e) =>
                          setNewClient({
                            ...newClient,
                            contact: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input
                        placeholder="john@acme.com"
                        value={newClient.email}
                        onChange={(e) =>
                          setNewClient({ ...newClient, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone</Label>
                      <Input
                        placeholder="+1 (555) 123-4567"
                        value={newClient.phone}
                        onChange={(e) =>
                          setNewClient({ ...newClient, phone: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Payment Terms</Label>
                    <Select
                      value={newClient.terms}
                      onValueChange={(v) =>
                        setNewClient({ ...newClient, terms: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Net 30">Net 30</SelectItem>
                        <SelectItem value="Net 15">Net 15</SelectItem>
                        <SelectItem value="Net 30">Net 30</SelectItem>
                        <SelectItem value="Net 60">Net 60</SelectItem>
                        <SelectItem value="Da">Da</SelectItem>
                        <SelectItem value="Upon Completion">
                          Upon Completion
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white font-bold"
                      onClick={handleAddClient}
                      disabled={!newClient.company || !newClient.contact}
                    >
                      Save Client & Use
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddClient(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Input
                      placeholder="Search client by name..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                    />
                  </div>

                  <div className="border border-gray-200 rounded-lg max-h-[200px] overflow-y-auto">
                    {filteredClients.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedClient(c);
                          setClientSearch("");
                        }}
                        className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${
                          selectedClient?.id === c.id ? "bg-indigo-50/50" : ""
                        }`}
                      >
                        <Building2 className="w-8 h-8 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">
                            {c.company}
                          </p>
                          <p className="text-xs text-gray-500">{c.contact}</p>
                        </div>
                        {selectedClient?.id === c.id && (
                          <div className="text-indigo-600">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    ))}
                    {filteredClients.length === 0 && (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        No clients found matching "{clientSearch}"
                      </div>
                    )}
                    <div
                      onClick={() => setShowAddClient(true)}
                      className="flex items-center gap-2 p-3 text-indigo-600 hover:bg-indigo-50 cursor-pointer border-t border-gray-200 font-bold text-sm"
                    >
                      <Plus className="w-4 h-4" /> Add New Client
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Campaign <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Search campaigns..."
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                />
              </div>
              <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto bg-white">
                {campaigns
                  .filter((c) =>
                    c.name.toLowerCase().includes(campaignSearch.toLowerCase()),
                  )
                  .map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCampaign(c);
                        setCampaignSearch("");
                      }}
                      className={`flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 ${
                        selectedCampaign?.id === c.id ? "bg-indigo-50/50" : ""
                      }`}
                    >
                      <Tag className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{c.name}</p>
                      </div>
                      {selectedCampaign?.id === c.id && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                  ))}
                <div
                  onClick={() => setShowCampaignModal(true)}
                  className="flex items-center gap-2 p-2 text-indigo-600 hover:bg-indigo-50 cursor-pointer border-t border-gray-100 font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Create New Campaign
                </div>
              </div>
              {selectedCampaign && (
                <div className="flex items-center justify-between p-2 bg-indigo-50 border border-indigo-100 rounded-lg mt-1">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-600" />
                    <p className="text-sm font-bold text-indigo-900">
                      Campaign: {selectedCampaign.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCampaign(null)}
                    className="text-indigo-400 hover:text-indigo-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={mode === "edit" ? undefined : todayDateString}
                />
                <div className="flex items-center gap-2 mt-1">
                  <Switch
                    id="allday"
                    checked={allDay}
                    onCheckedChange={setAllDay}
                  />
                  <Label
                    htmlFor="allday"
                    className="text-xs text-gray-500 cursor-pointer"
                  >
                    All-day booking
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label className={allDay ? "text-gray-300" : ""}>
                  Call Time
                </Label>
                <Input
                  type="time"
                  value={callTime}
                  onChange={(e) => setCallTime(e.target.value)}
                  disabled={allDay}
                  className={
                    allDay ? "opacity-30 cursor-not-allowed bg-gray-50" : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className={allDay ? "text-gray-300" : ""}>
                  Wrap Time
                </Label>
                <Input
                  type="time"
                  value={wrapTime}
                  onChange={(e) => setWrapTime(e.target.value)}
                  disabled={allDay}
                  className={
                    allDay ? "opacity-30 cursor-not-allowed bg-gray-50" : ""
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Enter address..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location Notes</Label>
              <Input
                placeholder="e.g., Studio B, 3rd floor"
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 pb-1">
              <div className="space-y-2">
                <Label>Rate/Fee</Label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {currency === "USD"
                      ? "$"
                      : currency === "EUR"
                        ? "€"
                        : currency === "GBP"
                          ? "£"
                          : "$"}
                  </span>
                  <Input
                    className="pl-7 pr-4"
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rate Type</Label>
                <Select value={rateType} onValueChange={setRateType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day Rate</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="flat">Flat Fee</SelectItem>
                    <SelectItem value="tbd">TBD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {rate > 0 && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center -mt-2">
                <span className="text-sm font-medium text-indigo-900">
                  Agency Commission (20%)
                </span>
                <span className="text-sm font-bold text-indigo-900">
                  {currency}{" "}
                  {commission.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Usage Terms</Label>
                <Select value={usageTerms} onValueChange={setUsageTerms}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select usage terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social">Social Media Only</SelectItem>
                    <SelectItem value="print">Print</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                    <SelectItem value="broadcast">Broadcast</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                    <SelectItem value="tbd">TBD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4 items-center">
                <div className="flex-1 space-y-2">
                  <Label>Usage Duration</Label>
                  <Select
                    value={usageDuration}
                    onValueChange={setUsageDuration}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 month">1 month</SelectItem>
                      <SelectItem value="6 months">6 months</SelectItem>
                      <SelectItem value="1 year">1 year</SelectItem>
                      <SelectItem value="perpetuity">In Perpetuity</SelectItem>
                      <SelectItem value="tbd">TBD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Switch checked={exclusive} onCheckedChange={setExclusive} />
                  <span className="text-sm font-medium text-gray-700">
                    Exclusive rights
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Attached Files (Call sheets, contracts, references)</Label>
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative group">
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 font-medium">
                  Browse...
                </span>
                <span className="text-sm text-gray-400">
                  {files.length === 0
                    ? "No files selected."
                    : `${files.length} file(s) selected`}
                </span>
                <input
                  type="file"
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const f = Array.from(e.target.files || []);
                    setFiles(f);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Special Instructions / Notes</Label>
              <Textarea
                placeholder="Internal notes, special instructions..."
                className="h-24"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Notifications</Label>
              <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {`Email ${entitySingularLower}`}
                    </div>
                    <p className="text-xs text-gray-500">
                      Send the booking confirmation by email.
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        email: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      In-app notification
                    </div>
                    <p className="text-xs text-gray-500">
                      Always on for bookings in the platform.
                    </p>
                  </div>
                  <Switch checked={notifications.push} disabled />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Send calendar invite and reminders
                    </div>
                    <p className="text-xs text-gray-500">
                      Opens Calendly after the booking is saved.
                    </p>
                  </div>
                  <Switch
                    checked={notifications.calendar}
                    onCheckedChange={handleCalendarToggle}
                    disabled={isCalendlyConfigLoading}
                  />
                </div>

                {!isCalendlyConfigured && (
                  <p className="text-xs text-amber-700">
                    {isCalendlyConfigLoading
                      ? "Checking Calendly integration setup..."
                      : calendlyConfigMessage}
                  </p>
                )}

                {notifications.calendar && (
                  <p className="text-xs text-amber-700">
                    Email and in-app notifications are sent first. Calendly
                    opens last and only supports one-to-one bookings.
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <div className="flex flex-col items-end gap-1">
              {validationIssues.length > 0 && !saving && (
                <div className="text-xs text-rose-600 font-medium text-right">
                  {validationIssues.join(" • ")}
                </div>
              )}
              <Button
                className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-2 rounded-xl transition-all ${
                  !canSubmit
                    ? "opacity-50 cursor-not-allowed grayscale-[0.5]"
                    : ""
                }`}
                onClick={submitBookings}
                disabled={!canSubmit}
              >
                {saving
                  ? "Saving..."
                  : notifications.calendar
                    ? "Save & Continue to Calendly"
                    : mode === "edit"
                      ? "Update Booking"
                      : `Save as ${
                          bookingType === "test-shoot"
                            ? "Test Shoot"
                            : bookingType.charAt(0).toUpperCase() +
                              bookingType.slice(1)
                        }`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Preview Booking
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-bold">{bookingType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{entitySingularTitle}</span>
              <span className="font-bold">
                {selectedTalents.map((t) => t.name).join(", ") || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Client</span>
              <span className="font-bold">
                {selectedClient?.company || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-bold">{date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">All Day</span>
              <span className="font-bold">{allDay ? "Yes" : "No"}</span>
            </div>
            {!allDay && (
              <div className="flex justify-between">
                <span className="text-gray-500">Time</span>
                <span className="font-bold">
                  {callTime} - {wrapTime}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Rate</span>
              <span className="font-bold">
                {rate > 0 ? `${currency} ${rate}` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Notifications</span>
              <span className="font-bold">
                {[
                  notifications.email && "Email",
                  notifications.push && "In-app",
                  notifications.calendar && "Calendar",
                ]
                  .filter(Boolean)
                  .join(", ") || "None"}
              </span>
            </div>
            {files.length > 0 && (
              <div>
                <span className="text-gray-500">Files</span>
                <div className="mt-1 text-gray-800">
                  {files.map((f) => f.name).join(", ")}
                </div>
              </div>
            )}
            {notes && (
              <div>
                <span className="text-gray-500">Notes</span>
                <div className="mt-1 text-gray-800 whitespace-pre-wrap">
                  {notes}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Back
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              onClick={async () => {
                await submitBookings();
                setPreviewOpen(false);
              }}
              disabled={!canSubmit}
            >
              {notifications.calendar
                ? "Confirm, Save & Continue"
                : "Confirm & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={calendlyEmbedOpen} onOpenChange={setCalendlyEmbedOpen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Complete Booking in Calendly
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>
              Email and in-app notifications have already been processed. Select
              the final time slot in Calendly to send the calendar invite and
              reminders.
            </span>
            <Button asChild variant="outline" className="shrink-0">
              <a href={calendlyEmbedUrl} target="_blank" rel="noreferrer">
                Open in new tab
              </a>
            </Button>
          </div>
          <div className="mt-4 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {calendlyEmbedUrl ? (
              calendlyEmbedLoadError ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-gray-500">
                  <div>{calendlyEmbedLoadError}</div>
                  <Button asChild variant="outline">
                    <a href={calendlyEmbedUrl} target="_blank" rel="noreferrer">
                      Open Calendly in new tab
                    </a>
                  </Button>
                </div>
              ) : (
                <div
                  ref={calendlyEmbedContainerRef}
                  className="h-full w-full overflow-auto"
                />
              )
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Calendly link unavailable.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showCampaignModal && (
        <CampaignModal
          open={showCampaignModal}
          onOpenChange={setShowCampaignModal}
          onSaveSuccess={(newCampaign) => {
            setCampaigns([...campaigns, newCampaign]);
            setSelectedCampaign(newCampaign);
          }}
        />
      )}
    </>
  );
};
