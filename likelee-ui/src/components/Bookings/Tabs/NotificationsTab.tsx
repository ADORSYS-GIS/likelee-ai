import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Mail,
  Phone,
  XCircle,
  Filter,
  AlertCircle,
  Send,
  Search,
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
import { listBookingNotifications, getAgencyRoster } from "@/api/functions";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";

import { format, parseISO } from "date-fns";

type BookingLike = {
  id?: string;
  date?: string;
  callTime?: string;
  location?: string;
  clientName?: string;
  client?: string;
  talentName?: string;
  talent_name?: string;
};

type BookingNotificationRow = {
  id: string;
  booking_id: string;
  channel: string;
  recipient_type: string;
  to_email?: string | null;
  subject?: string | null;
  message: string;
  meta_json?: any;
  created_at: string;
};

export const NotificationsTab = ({
  bookings = [] as BookingLike[],
  isSportsAgency = false,
}: {
  bookings?: BookingLike[];
  isSportsAgency?: boolean;
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const effectiveAgencyId = (profile as any)?.organization_id || profile?.id;

  const { data: rosterRaw, isLoading: isLoadingRoster } = useQuery({
    queryKey: ["agency-roster", user?.id],
    queryFn: async () => {
      const resp = await getAgencyRoster();
      return (resp as any) || [];
    },
    enabled: !!user?.id,
  });

  const roster = useMemo(() => {
    const d: any = rosterRaw;
    if (!d) return [];
    if (Array.isArray(d?.talents)) return d.talents;
    if (Array.isArray(d)) return d;
    return [];
  }, [rosterRaw]);

  const entitySingularTitle = isSportsAgency ? "Athlete" : "Talent";
  const entitySingularLower = isSportsAgency ? "athlete" : "talent";
  const [activeSubNav, setActiveSubNav] = useState("logs");
  const [testNotificationType, setTestNotificationType] = useState("");
  const [testTargetTalent, setTestTargetTalent] = useState("");

  const [bookingNotifications, setBookingNotifications] = useState<
    BookingNotificationRow[]
  >([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Controlled settings from database
  const [agencySettings, setAgencySettings] = useState<any>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    if (!effectiveAgencyId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("agency_notification_settings")
          .select("*")
          .eq("agency_id", effectiveAgencyId)
          .maybeSingle();

        if (error) throw error;
        if (data) setAgencySettings(data);
      } catch (e: any) {
        console.error("Error loading notification settings:", e);
      } finally {
        setIsLoadingSettings(false);
      }
    })();
  }, [effectiveAgencyId]);

  const createdChannels = useMemo(() => {
    // Extract global settings from agencySettings.prefs
    // Schema: [{ key: 'booking_confirmation', channels: { email: true, ... } }, ...]
    const prefs = Array.isArray(agencySettings?.prefs)
      ? agencySettings.prefs
      : [];
    const bookingConf = prefs.find(
      (p: any) => p.key === "booking_confirmation",
    );
    return {
      email: bookingConf?.channels?.email ?? true,
      sms: bookingConf?.channels?.sms ?? false,
      push: bookingConf?.channels?.push ?? false,
    };
  }, [agencySettings]);

  const updateGlobalChannel = async (channel: string, enabled: boolean) => {
    if (!effectiveAgencyId) return;

    const previousSettings = { ...agencySettings };
    const currentPrefs = Array.isArray(agencySettings?.prefs)
      ? [...agencySettings.prefs]
      : [];
    let bookingConfIndex = currentPrefs.findIndex(
      (p: any) => p.key === "booking_confirmation",
    );

    if (bookingConfIndex === -1) {
      currentPrefs.push({
        key: "booking_confirmation",
        channels: { email: true, sms: false, push: false },
      });
      bookingConfIndex = currentPrefs.length - 1;
    }

    const newChannels = {
      ...currentPrefs[bookingConfIndex].channels,
      [channel]: enabled,
    };
    currentPrefs[bookingConfIndex] = {
      ...currentPrefs[bookingConfIndex],
      channels: newChannels,
    };

    // Optimistic update
    setAgencySettings((prev: any) => ({ ...prev, prefs: currentPrefs }));

    try {
      const { error } = await supabase
        .from("agency_notification_settings")
        .upsert(
          {
            agency_id: effectiveAgencyId,
            prefs: currentPrefs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "agency_id" },
        );

      if (error) throw error;
    } catch (e: any) {
      console.error("Failed to update setting:", e);
      // Revert on error
      setAgencySettings(previousSettings);
      toast({
        title: "Failed to update setting",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const getAthleteChannels = (athleteId: string) => {
    // Extract per-athlete overrides from agencySettings.prefs
    // Using key: 'athlete:ID' pattern in the prefs array to stay compatible with existing array schema
    const prefs = Array.isArray(agencySettings?.prefs)
      ? agencySettings.prefs
      : [];
    const override = prefs.find((p: any) => p.key === `athlete:${athleteId}`);
    return {
      email: override?.channels?.email ?? true,
      sms: override?.channels?.sms ?? false,
      push: override?.channels?.push ?? false,
    };
  };

  const updateAthleteChannel = async (
    athleteId: string,
    channel: string,
    enabled: boolean,
  ) => {
    if (!effectiveAgencyId) return;

    const previousSettings = { ...agencySettings };
    const currentPrefs = Array.isArray(agencySettings?.prefs)
      ? [...agencySettings.prefs]
      : [];
    const key = `athlete:${athleteId}`;
    let overrideIndex = currentPrefs.findIndex((p: any) => p.key === key);

    if (overrideIndex === -1) {
      currentPrefs.push({
        key,
        channels: { email: true, sms: false, push: false },
      });
      overrideIndex = currentPrefs.length - 1;
    }

    const newChannels = {
      ...currentPrefs[overrideIndex].channels,
      [channel]: enabled,
    };
    currentPrefs[overrideIndex] = {
      ...currentPrefs[overrideIndex],
      channels: newChannels,
    };

    // Optimistic update
    setAgencySettings((prev: any) => ({ ...prev, prefs: currentPrefs }));

    try {
      const { error } = await supabase
        .from("agency_notification_settings")
        .upsert(
          {
            agency_id: effectiveAgencyId,
            prefs: currentPrefs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "agency_id" },
        );

      if (error) throw error;
    } catch (e: any) {
      console.error("Failed to update preference:", e);
      // Revert on error
      setAgencySettings(previousSettings);
      toast({
        title: "Failed to update preference",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const talentNames = useMemo(() => {
    if (!roster || !Array.isArray(roster)) return [];
    return roster.map(
      (t: any) => t.name || t.talent_name || t.stage_name || "Unnamed",
    );
  }, [roster]);

  useEffect(() => {
    if (activeSubNav !== "logs") return;
    let cancelled = false;
    setLoadingLogs(true);
    (async () => {
      try {
        const rows = await listBookingNotifications({ limit: 100 });
        const arr = Array.isArray(rows) ? rows : [];
        if (!cancelled) setBookingNotifications(arr as any);
      } catch (e: any) {
        if (!cancelled) setBookingNotifications([]);
        toast({
          title: "Failed to load notifications",
          description: e?.message || "Please try again.",
          variant: "destructive" as any,
        });
      } finally {
        if (!cancelled) setLoadingLogs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSubNav, toast]);

  const stats = useMemo(() => {
    const emailRows = bookingNotifications.filter(
      (n) => (n.channel || "").toLowerCase() === "email",
    );
    const ok = emailRows.filter(
      (n) => (n.meta_json as any)?.smtp_status === "ok",
    ).length;
    const failed = emailRows.length - ok;
    return [
      {
        label: "Emails Sent",
        value: String(ok),
        subtitle: "",
        icon: Mail,
        color: "text-blue-600",
      },
      {
        label: "SMS Sent",
        value: "0",
        subtitle: "Coming Soon",
        icon: Phone,
        color: "text-green-600",
      },
      {
        label: "Push Sent",
        value: "0",
        subtitle: "Coming Soon",
        icon: Bell,
        color: "text-purple-600",
      },
      {
        label: "Failed",
        value: String(failed),
        subtitle: "",
        icon: XCircle,
        color: "text-red-600",
      },
    ];
  }, [bookingNotifications]);

  const notifications = useMemo(() => {
    const items: {
      type: "EMAIL" | "SMS" | "PUSH";
      title: string;
      recipient: string;
      message: string;
      time: string;
      status: "success" | "error";
      detail: string;
    }[] = [];

    const enabledTypes: ("EMAIL" | "SMS" | "PUSH")[] = [];
    if (createdChannels.email) enabledTypes.push("EMAIL");
    if (createdChannels.sms) enabledTypes.push("SMS");
    if (createdChannels.push) enabledTypes.push("PUSH");

    const rows = bookingNotifications
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 50);

    for (const r of rows) {
      const ch = (r.channel || "").toUpperCase();
      if (ch !== "EMAIL" && ch !== "SMS" && ch !== "PUSH") continue;
      if (!enabledTypes.includes(ch as any)) continue;

      const ts = r.created_at
        ? format(parseISO(r.created_at), "MMM d, yyyy")
        : "";
      const ok = (r.meta_json as any)?.smtp_status === "ok";
      items.push({
        type: ch as any,
        title: "Booking Created",
        recipient: r.to_email || "",
        message: r.subject || r.message,
        time: ts,
        status: ok ? "success" : "error",
        detail: ok ? "Sent" : "Failed",
      });
    }
    return items;
  }, [bookingNotifications, createdChannels]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-8 h-8 text-gray-700" />
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Notifications Center
          </h2>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Manage booking notifications and delivery logs
          </p>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="overflow-x-auto border-b border-gray-200">
        <div className="flex gap-1 min-w-max">
          {[
            "Notification Logs",
            "Settings",
            `${entitySingularTitle} Preferences`,
            "Test Notifications",
          ].map((tab, idx) => (
            <button
              key={tab}
              onClick={() =>
                setActiveSubNav(
                  ["logs", "settings", "preferences", "test"][idx],
                )
              }
              className={`px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeSubNav ===
                ["logs", "settings", "preferences", "test"][idx]
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeSubNav === "logs" && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {stats.map((s) => (
              <Card
                key={s.label}
                className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl"
              >
                <div className="flex items-center gap-3 mb-2">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                  <p className="text-xs font-bold text-gray-500 uppercase">
                    {s.label}
                  </p>
                </div>
                <p className="text-4xl font-extrabold text-gray-900 mb-1">
                  {s.value}
                </p>
                <p className="text-xs text-gray-500">{s.subtitle}</p>
              </Card>
            ))}
          </div>

          <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Recent Notifications
              </h3>
              <Button variant="outline" className="font-bold text-gray-700">
                <Filter className="w-4 h-4 mr-2" /> Filter
              </Button>
            </div>

            <div className="space-y-3">
              {loadingLogs && (
                <div className="p-6 text-center text-sm text-gray-500">
                  Loading…
                </div>
              )}
              {!loadingLogs && notifications.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500">
                  No notification logs yet.
                </div>
              )}
              {notifications.map((notif, idx) => (
                <Card
                  key={idx}
                  className={`p-4 border ${
                    notif.status === "error"
                      ? "border-red-200 bg-red-50"
                      : "border-gray-100 hover:border-indigo-200 transition-colors"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-4 min-w-0">
                      <div
                        className={`p-2 rounded-lg ${
                          notif.type === "EMAIL"
                            ? "bg-blue-100 text-blue-600"
                            : notif.type === "SMS"
                              ? "bg-green-100 text-green-600"
                              : "bg-purple-100 text-purple-600"
                        }`}
                      >
                        {notif.type === "EMAIL" && <Mail className="w-5 h-5" />}
                        {notif.type === "SMS" && <Phone className="w-5 h-5" />}
                        {notif.type === "PUSH" && <Bell className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900">
                            {notif.title}
                          </h4>
                          <span className="text-xs font-medium text-gray-500">
                            • {notif.type}
                          </span>
                          {notif.status === "error" && (
                            <Badge variant="destructive" className="h-5 px-1.5">
                              Failed
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-900 font-medium mt-0.5">
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          To:{" "}
                          <span className="font-bold">{notif.recipient}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-bold text-gray-500">
                        {notif.time}
                      </p>
                      <p
                        className={`text-xs font-bold mt-1 ${
                          notif.status === "success"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {notif.detail}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </>
      )}

      {activeSubNav === "settings" && (
        <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Event Notification Settings
            </h3>
            <p className="text-sm text-gray-500">
              Configure which channels to use for each event type
            </p>
          </div>

          <div className="space-y-4">
            {/* Booking Created/Confirmed */}
            <div className="pb-4 border-b border-gray-100">
              <h4 className="font-bold text-gray-900 mb-3 text-sm">
                Booking Created/Confirmed
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8">
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-900" />
                    <span className="text-sm font-medium text-gray-900">
                      Email
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createdChannels.email}
                      onChange={(e) =>
                        updateGlobalChannel("email", e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-900" />
                    <span className="text-sm font-medium text-gray-900">
                      SMS
                    </span>
                    <span className="text-xs text-gray-400 font-bold">
                      Coming Soon
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={false}
                      disabled
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-gray-900" />
                    <span className="text-sm font-medium text-gray-900">
                      Push
                    </span>
                    <span className="text-xs text-gray-400 font-bold">
                      Coming Soon
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={false}
                      disabled
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Booking Updated */}
            <div className="pb-4 border-b border-gray-100">
              <h4 className="font-bold text-gray-900 mb-3 text-sm">
                Booking Updated
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8">
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-900" />
                    <span className="text-sm font-medium text-gray-900">
                      Email
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-900" />
                    <span className="text-sm font-medium text-gray-900">
                      SMS
                    </span>
                    <span className="text-xs text-gray-400 font-bold">
                      Coming Soon
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      disabled
                      checked={false}
                      readOnly
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-gray-900" />
                    <span className="text-sm font-medium text-gray-900">
                      Push
                    </span>
                    <span className="text-xs text-gray-400 font-bold">
                      Coming Soon
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      disabled
                      checked={false}
                      readOnly
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Booking Cancelled */}
            <div className="pb-4 border-b border-gray-100">
              <h4 className="font-bold text-gray-900 mb-3 text-sm">
                Booking Cancelled
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8">
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-900" />
                    <span className="text-sm font-medium text-gray-900">
                      Email
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-900" />
                    <span className="text-sm font-medium text-gray-900">
                      SMS
                    </span>
                    <span className="text-xs text-gray-400 font-bold">
                      Coming Soon
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      disabled
                      checked={false}
                      readOnly
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-gray-900" />
                    <span className="text-sm font-medium text-gray-900">
                      Push
                    </span>
                    <span className="text-xs text-gray-400 font-bold">
                      Coming Soon
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      disabled
                      checked={false}
                      readOnly
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Automatic Reminders */}
            <div className="pt-2">
              <h4 className="font-bold text-gray-900 mb-3 text-sm">
                Automatic Reminders
              </h4>

              <div className="space-y-3">
                <div className="pb-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 mb-3">
                    24 Hours Before Booking
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8">
                    <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-900" />
                        <span className="text-sm font-medium text-gray-900">
                          Email
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-900" />
                        <span className="text-sm font-medium text-gray-900">
                          SMS
                        </span>
                        <span className="text-xs text-gray-400 font-bold">
                          Coming Soon
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          disabled
                          checked={false}
                          readOnly
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-gray-900" />
                        <span className="text-sm font-medium text-gray-900">
                          Push
                        </span>
                        <span className="text-xs text-gray-400 font-bold">
                          Coming Soon
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          disabled
                          checked={false}
                          readOnly
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pb-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 mb-3">
                    48 Hours Before Booking
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8">
                    <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-900" />
                        <span className="text-sm font-medium text-gray-900">
                          Email
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-900" />
                        <span className="text-sm font-medium text-gray-900">
                          SMS
                        </span>
                        <span className="text-xs text-gray-400 font-bold">
                          Coming Soon
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          disabled
                          checked={false}
                          readOnly
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-gray-900" />
                        <span className="text-sm font-medium text-gray-900">
                          Push
                        </span>
                        <span className="text-xs text-gray-400 font-bold">
                          Coming Soon
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          disabled
                          checked={false}
                          readOnly
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900 mb-3">
                    1 Week Before Booking
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8">
                    <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-900" />
                        <span className="text-sm font-medium text-gray-900">
                          Email
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-900" />
                        <span className="text-sm font-medium text-gray-900">
                          SMS
                        </span>
                        <span className="text-xs text-gray-400 font-bold">
                          Coming Soon
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          disabled
                          checked={false}
                          readOnly
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-gray-900" />
                        <span className="text-sm font-medium text-gray-900">
                          Push
                        </span>
                        <span className="text-xs text-gray-400 font-bold">
                          Coming Soon
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          disabled
                          checked={false}
                          readOnly
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeSubNav === "preferences" && (
        <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {`Per-${entitySingularTitle} Notification Preferences`}
            </h3>
            <p className="text-sm text-gray-600">
              {`Override agency defaults for specific ${entitySingularLower}`}
            </p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={`Search ${entitySingularLower} by name...`}
              className="pl-9"
              onChange={(e) => setTestTargetTalent(e.target.value)}
              value={testTargetTalent}
            />
          </div>

          <div className="space-y-4">
            {isLoadingRoster ? (
              <div className="p-12 text-center text-sm text-gray-500">
                Loading roster...
              </div>
            ) : !roster || roster.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-500">
                No athletes found in roster.
              </div>
            ) : (
              roster
                .filter((t: any) => {
                  const name = (t.name || t.talent_name || "").toLowerCase();
                  return name.includes(testTargetTalent.toLowerCase());
                })
                .map((talent: any, idx) => (
                  <Card
                    key={idx}
                    className="p-4 border border-gray-200 bg-white rounded-xl"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                        {talent.image ||
                        talent.img ||
                        talent.avatar ||
                        talent.profile_image_url ||
                        talent.profile_photo_url ||
                        talent.talent_avatar ? (
                          <img
                            src={
                              talent.image ||
                              talent.img ||
                              talent.avatar ||
                              talent.profile_image_url ||
                              talent.profile_photo_url ||
                              talent.talent_avatar
                            }
                            alt={talent.name || talent.talent_name || "Talent"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-600 font-bold text-xs">
                            {(
                              talent.name ||
                              talent.talent_name ||
                              talent.stage_name ||
                              "??"
                            )
                              .substring(0, 2)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">
                          {talent.name || talent.talent_name}
                        </h4>
                        <p className="text-sm text-gray-500">{talent.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8">
                      <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                        <span className="text-sm font-bold text-gray-900">
                          Email
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={getAthleteChannels(talent.id).email}
                            onChange={(e) =>
                              updateAthleteChannel(
                                talent.id,
                                "email",
                                e.target.checked,
                              )
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-2">
                        <span className="text-sm font-bold text-gray-900">
                          SMS
                        </span>
                        <span className="text-xs text-gray-400 font-bold">
                          Coming Soon
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            disabled
                            checked={false}
                            readOnly
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-2">
                        <span className="text-sm font-bold text-gray-900">
                          Push
                        </span>
                        <span className="text-xs text-gray-400 font-bold">
                          Coming Soon
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            disabled
                            checked={false}
                            readOnly
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                        </label>
                      </div>
                    </div>
                  </Card>
                ))
            )}
          </div>
        </Card>
      )}

      {activeSubNav === "test" && (
        <Card className="p-4 sm:p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Test Notification Delivery
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              Send a test notification to verify delivery and formatting
            </p>
          </div>

          <div className="space-y-6 max-w-full">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">
                Notification Type
              </Label>
              <Select
                value={testNotificationType}
                onValueChange={setTestNotificationType}
              >
                <SelectTrigger className="h-12 border-gray-200 rounded-xl">
                  <SelectValue placeholder="Select notification type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    Email (with .ics attachment)
                  </SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push notification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">
                {`Select ${entitySingularTitle}`}
              </Label>
              <Select
                value={testTargetTalent}
                onValueChange={setTestTargetTalent}
              >
                <SelectTrigger className="h-12 border-gray-200 rounded-xl">
                  <SelectValue
                    placeholder={`Choose ${entitySingularLower} to notify`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {talentNames.map((name: string) => (
                    <SelectItem key={name} value={name.toLowerCase()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-white rounded-full text-amber-500 shadow-sm">
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-sm text-amber-800 font-medium">
                Test notifications will be sent with "[TEST]" prefix and won't
                count toward billing.
              </p>
            </div>

            <Button
              className={`w-full bg-indigo-400 hover:bg-indigo-500 text-white font-bold h-14 rounded-xl shadow-md transition-all flex items-center justify-center gap-3 text-lg ${
                !testNotificationType || !testTargetTalent
                  ? "opacity-50 cursor-not-allowed grayscale-[0.3]"
                  : ""
              }`}
              onClick={() => {
                if (!testNotificationType || !testTargetTalent) return;

                const talentName =
                  talentNames.find(
                    (t: string) => t.toLowerCase() === testTargetTalent,
                  ) || testTargetTalent;

                toast({
                  title: "Notification Sent",
                  description: `Test ${testNotificationType} notification sent to ${talentName}!`,
                  action: (
                    <Button variant="outline" size="sm" onClick={() => {}}>
                      OK
                    </Button>
                  ),
                });
              }}
              disabled={!testNotificationType || !testTargetTalent}
            >
              <Send className="w-5 h-5" />
              Send Test Notification
            </Button>

            <div className="pt-8">
              <h4 className="text-lg font-bold text-gray-900 mb-6 uppercase tracking-wider">
                Preview Templates
              </h4>

              <Card className="border border-gray-200 rounded-2xl bg-gray-50/50 p-6 overflow-hidden">
                {testNotificationType === "email" && (
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        Subject:
                      </p>
                      <p className="text-base font-bold text-gray-900">
                        [TEST] New Booking: Glossier Beauty on Jan 15, 2026
                      </p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-8 shadow-sm">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">
                        Body Preview:
                      </p>
                      <div className="space-y-4 text-[15px] text-gray-700 leading-relaxed">
                        <p className="font-medium text-gray-900">Hi Emma,</p>
                        <p className="font-medium text-gray-600">
                          You have a new confirmed booking:
                        </p>
                        <div className="space-y-2 pt-2">
                          <p>
                            <span className="font-bold text-gray-900">
                              Client:
                            </span>{" "}
                            Glossier Beauty
                          </p>
                          <p>
                            <span className="font-bold text-gray-900">
                              Date:
                            </span>{" "}
                            Wednesday, January 15, 2026
                          </p>
                          <p>
                            <span className="font-bold text-gray-900">
                              Call Time:
                            </span>{" "}
                            9:00 AM
                          </p>
                          <p>
                            <span className="font-bold text-gray-900">
                              Wrap Time:
                            </span>{" "}
                            5:00 PM
                          </p>
                          <p>
                            <span className="font-bold text-gray-900">
                              Location:
                            </span>{" "}
                            123 Main St, New York, NY
                          </p>
                          <p>
                            <span className="font-bold text-gray-900">
                              Rate:
                            </span>{" "}
                            $1,200 Day Rate
                          </p>
                        </div>
                        <p className="text-sm font-medium text-gray-400 mt-6 border-t border-gray-50 pt-4 italic">
                          Calendar invite (.ics) attached
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {testNotificationType === "sms" && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Message Preview (160 chars max):
                    </p>
                    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm min-h-[80px] flex items-center">
                      <p className="text-sm text-gray-900 font-medium leading-relaxed">
                        [TEST] You're booked for Glossier on Jan 15 at 9:00 AM.
                        Location: 123 Main St, NY. Call time 9AM.
                      </p>
                    </div>
                    <p className="text-[11px] font-bold text-gray-400">
                      Character count: 98/160
                    </p>
                  </div>
                )}

                {testNotificationType === "push" && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Notification Preview:
                    </p>
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xl max-w-sm flex gap-4 items-center animate-in slide-in-from-top-4 duration-500">
                      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 transform scale-95">
                        <Bell className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            Likelee Agency
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">
                            now
                          </p>
                        </div>
                        <p className="text-[13px] font-bold text-indigo-600 mb-0.5">
                          [TEST] New Booking
                        </p>
                        <p className="text-[12px] font-medium text-gray-600 leading-tight">
                          Glossier Beauty on Jan 15 at 9:00 AM
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
