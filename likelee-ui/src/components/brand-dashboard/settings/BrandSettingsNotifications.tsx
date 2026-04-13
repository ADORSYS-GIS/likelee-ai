import React from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";

type BrandSettingsNotificationsProps = {
  notificationPrefs: Record<string, boolean>;
  onToggleNotificationPref: (prefId: string, value: boolean) => void;
  isSavingNotificationPrefs: boolean;
};

export const BrandSettingsNotifications = ({
  notificationPrefs,
  onToggleNotificationPref,
  isSavingNotificationPrefs,
}: BrandSettingsNotificationsProps) => (
  <Card className="p-8 bg-white border border-gray-200 rounded-lg shadow-none">
    <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
      <Bell className="w-6 h-6" /> Communication Preferences
    </h3>
    <div className="space-y-2">
      {[
        {
          id: "newProjectAlerts",
          title: "New Project Alerts",
          desc: "When talent accepts or delivers assets",
        },
        {
          id: "deliverableSubmissions",
          title: "Deliverable Submissions",
          desc: "When creators submit work for approval",
        },
        {
          id: "approvalReminders",
          title: "Approval Reminders",
          desc: "Approval reminder notifications",
        },
        {
          id: "licenseExpirationAlerts",
          title: "License Expiration Alerts",
          desc: "10-day advance notice",
        },
        {
          id: "monthlyAnalyticsSummary",
          title: "Monthly Analytics Summary",
          desc: "Monthly performance email report",
          comingSoon: true,
        },
      ].map((pref) => (
        <div
          key={pref.id}
          className="flex items-center justify-between py-6 border-b border-gray-100 last:border-0"
        >
          <div className="pr-12 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Label
                className={`text-sm font-bold ${pref.comingSoon ? "text-gray-400" : "text-gray-900"}`}
              >
                {pref.title}
              </Label>
              {pref.comingSoon && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-900 text-white">
                  Coming Soon
                </span>
              )}
            </div>
            <p
              className={`text-xs font-medium ${pref.comingSoon ? "text-gray-400" : "text-gray-500"}`}
            >
              {pref.desc}
            </p>
          </div>
          <Switch
            checked={notificationPrefs[pref.id]}
            onCheckedChange={(val) => onToggleNotificationPref(pref.id, val)}
            disabled={pref.comingSoon}
            className="data-[state=checked]:bg-[#F7B750] disabled:opacity-30 disabled:cursor-not-allowed"
          />
        </div>
      ))}
    </div>
  </Card>
);
