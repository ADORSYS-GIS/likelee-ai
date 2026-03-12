import React from "react";
import { Calendar } from "lucide-react";

import { CalendarScheduleTab } from "./Tabs/CalendarScheduleTab";
import { BookingRequestsTab } from "./Tabs/BookingRequestsTab";
import { ClientDatabaseTab } from "./Tabs/ClientDatabaseTab";
import { TalentAvailabilityTab } from "./Tabs/TalentAvailabilityTab";
import { ManagementAnalyticsView } from "./ManagementAnalyticsView";
import { NotificationsTab } from "./Tabs/NotificationsTab";
import { CampaignsTab } from "./Tabs/CampaignsTab";
// getCalendlyBookingUrl removed

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

  let content;
  if (activeSubTab === "Calendar & Schedule") {
    content = (
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
  } else if (activeSubTab === "Booking Requests") {
    content = <BookingRequestsTab />;
  } else if (activeSubTab === "Client Database") {
    content = <ClientDatabaseTab />;
  } else if (
    activeSubTab === "Talent Availability" ||
    activeSubTab === "Athlete Availability" ||
    activeSubTab === availabilitySubTab
  ) {
    content = (
      <TalentAvailabilityTab
        bookOuts={bookOuts}
        onAddBookOut={onAddBookOut}
        onRemoveBookOut={onRemoveBookOut}
        fixedTalent={fixedTalent}
        isSportsAgency={isSportsAgency}
      />
    );
  } else if (activeSubTab === "Notifications") {
    content = (
      <NotificationsTab bookings={bookings} isSportsAgency={isSportsAgency} />
    );
  } else if (activeSubTab === "Management & Analytics") {
    content = <ManagementAnalyticsView bookings={bookings} />;
  } else if (activeSubTab === "Campaigns") {
    content = <CampaignsTab />;
  } else {
    content = <PlaceholderView activeSubTab={activeSubTab} />;
  }

  return <>{content}</>;
};
