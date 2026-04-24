import React from "react";
import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";

export const BookingRequestsTab = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {t("agencyDashboard.bookings.tabs.bookingRequests.title", {
              defaultValue: "Booking Requests",
            })}
          </h2>
          <p className="text-gray-500 font-medium text-sm mt-1">
            {t("agencyDashboard.bookings.tabs.bookingRequests.subtitle", {
              defaultValue: "Review and manage incoming booking requests",
            })}
          </p>
        </div>
      </div>

      <div className="border border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center text-center h-[400px]">
        <div className="bg-gray-50 p-4 rounded-full mb-4">
          <Calendar className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {t("agencyDashboard.bookings.tabs.bookingRequests.comingSoonTitle", {
            defaultValue: "Booking requests feature coming soon",
          })}
        </h3>
        <p className="text-gray-500 max-w-md">
          {t(
            "agencyDashboard.bookings.tabs.bookingRequests.comingSoonDescription",
            { defaultValue: "Manage incoming booking requests from clients" },
          )}
        </p>
      </div>
    </div>
  );
};
