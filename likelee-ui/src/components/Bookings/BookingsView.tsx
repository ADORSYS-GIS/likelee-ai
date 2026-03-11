import React, { useState, useEffect } from "react";
import { Calendar, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { CalendarScheduleTab } from "./Tabs/CalendarScheduleTab";
import { BookingRequestsTab } from "./Tabs/BookingRequestsTab";
import { ClientDatabaseTab } from "./Tabs/ClientDatabaseTab";
import { TalentAvailabilityTab } from "./Tabs/TalentAvailabilityTab";
import { ManagementAnalyticsView } from "./ManagementAnalyticsView";
import { NotificationsTab } from "./Tabs/NotificationsTab";
import { CampaignsTab } from "./Tabs/CampaignsTab";
import { getCalendlyBookingUrl } from "@/api/functions";

// We keep PlaceholderView for fallback
const PlaceholderView = ({ activeSubTab }: { activeSubTab: string }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center">
    <div className="p-6 bg-gray-100 rounded-full mb-4">
      <Calendar className="w-12 h-12 text-gray-400" />
    </div>
    <h2 className="text-xl font-bold text-gray-900 mb-2">{activeSubTab}</h2>
    <p className="text-gray-500">Feature currently under development.</p>
  </div>
);

export const BookingsView = ({
  activeSubTab,
  bookings,
  onAddBooking,
  bookOuts = [],
  onAddBookOut,
  onRemoveBookOut,
  onUpdateBooking,
  onCancelBooking,
  fixedTalent,
  disableBookingEdits,
  isSportsAgency = false,
  agencyMode = "AI",
}: {
  activeSubTab: string;
  bookings: any[];
  onAddBooking: (booking: any) => void;
  onUpdateBooking: (booking: any) => void;
  onCancelBooking: (id: string) => void;
  bookOuts: any[];
  onAddBookOut: (bookOut: any) => void;
  onRemoveBookOut: (id: string) => void;
  fixedTalent?: { id: string; name: string };
  disableBookingEdits?: boolean;
  isSportsAgency?: boolean;
  agencyMode?: "AI" | "IRL";
}) => {
  const availabilitySubTab = isSportsAgency
    ? "Athlete Availability"
    : "Talent Availability";

  // Calendly integration state for IRL mode
  const [showCalendlyModal, setShowCalendlyModal] = useState(false);
  const [calendlyUrl, setCalendlyUrl] = useState<string | null>(null);
  const [calendlyLoading, setCalendlyLoading] = useState(false);

  useEffect(() => {
    if (agencyMode === "IRL" && !calendlyUrl && !calendlyLoading) {
      setCalendlyLoading(true);
      getCalendlyBookingUrl()
        .then((res) => {
          if (res.status === "success" && res.data?.booking_url) {
            setCalendlyUrl(res.data.booking_url);
          }
        })
        .catch(() => {
          // Silently fail - Calendly not configured
        })
        .finally(() => setCalendlyLoading(false));
    }
  }, [agencyMode, calendlyUrl, calendlyLoading]);

  if (activeSubTab === "Calendar & Schedule")
    return (
      <CalendarScheduleTab
        bookings={bookings}
        onAddBooking={onAddBooking}
        onUpdateBooking={onUpdateBooking}
        onCancelBooking={onCancelBooking}
        bookOuts={bookOuts}
        onAddBookOut={onAddBookOut}
        onRemoveBookOut={onRemoveBookOut}
        fixedTalent={fixedTalent}
        disableBookingEdits={disableBookingEdits}
        isSportsAgency={isSportsAgency}
      />
    );
  if (activeSubTab === "Booking Requests") return <BookingRequestsTab />;
  if (activeSubTab === "Client Database") return <ClientDatabaseTab />;
  if (
    activeSubTab === "Talent Availability" ||
    activeSubTab === "Athlete Availability" ||
    activeSubTab === availabilitySubTab
  )
    return (
      <TalentAvailabilityTab
        bookOuts={bookOuts}
        onAddBookOut={onAddBookOut}
        onRemoveBookOut={onRemoveBookOut}
        fixedTalent={fixedTalent}
        isSportsAgency={isSportsAgency}
      />
    );
  if (activeSubTab === "Notifications")
    return (
      <NotificationsTab bookings={bookings} isSportsAgency={isSportsAgency} />
    );
  if (activeSubTab === "Management & Analytics")
    return <ManagementAnalyticsView bookings={bookings} />;
  if (activeSubTab === "Campaigns") return <CampaignsTab />;

  return (
    <>
      <PlaceholderView activeSubTab={activeSubTab} />

      {/* IRL Mode: Book a Demo CTA */}
      {agencyMode === "IRL" && calendlyUrl && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            onClick={() => setShowCalendlyModal(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg rounded-full px-6 py-3 font-bold flex items-center gap-2"
          >
            <Video className="w-5 h-5" />
            Book a Demo
          </Button>
        </div>
      )}

      {/* Calendly Modal */}
      <Dialog open={showCalendlyModal} onOpenChange={setShowCalendlyModal}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Schedule a Demo</DialogTitle>
            <DialogDescription>
              Book a demo session with our team using Calendly.
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-full bg-white">
            {calendlyUrl && (
              <iframe
                src={calendlyUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                title="Schedule a Demo"
                style={{ minHeight: "100%" }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
