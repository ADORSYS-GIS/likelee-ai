import React, { useState } from "react";
import { Calendar } from "lucide-react";

import { CalendarScheduleTab } from "./Tabs/CalendarScheduleTab";
import { BookingRequestsTab } from "./Tabs/BookingRequestsTab";
import { ClientDatabaseTab } from "./Tabs/ClientDatabaseTab";
import { TalentAvailabilityTab } from "./Tabs/TalentAvailabilityTab";
import { NotificationsTab } from "./Tabs/NotificationsTab";
import { ManagementAnalyticsView } from "./ManagementAnalyticsView";

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
}: {
    activeSubTab: string;
    bookings: any[];
    onAddBooking: (booking: any) => void;
    onUpdateBooking: (booking: any) => void;
    onCancelBooking: (id: string) => void;
    bookOuts: any[];
    onAddBookOut: (bookOut: any) => void;
    onRemoveBookOut: (id: string) => void;
}) => {
    if (activeSubTab === "Calendar & Schedule")
        return (
            <CalendarScheduleTab
                bookings={bookings}
                onAddBooking={onAddBooking}
                onUpdateBooking={onUpdateBooking}
                onCancelBooking={onCancelBooking}
            />
        );
    if (activeSubTab === "Booking Requests") return <BookingRequestsTab />;
    if (activeSubTab === "Client Database") return <ClientDatabaseTab />;
    if (activeSubTab === "Talent Availability")
        return (
            <TalentAvailabilityTab
                bookOuts={bookOuts}
                onAddBookOut={onAddBookOut}
                onRemoveBookOut={onRemoveBookOut}
            />
        );
    if (activeSubTab === "Notifications") return <NotificationsTab />;
    if (activeSubTab === "Management & Analytics")
        return <ManagementAnalyticsView bookings={bookings} />;

    return <PlaceholderView activeSubTab={activeSubTab} />;
};
