import React, { useState } from "react";
import { Calendar, Building2, Bell, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Placeholder components for the sub-tabs
const CalendarScheduleTab = ({
    bookings,
    onAddBooking,
    onUpdateBooking,
    onCancelBooking,
}: any) => (
    <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6 bg-gray-100 rounded-full mb-4">
            <Calendar className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Calendar & Schedule</h3>
        <p className="text-gray-500 max-w-sm text-center mb-6">
            Manage your talent bookings and schedule.
        </p>
        <Button onClick={() => onAddBooking?.({})} className="font-bold">
            Add Booking
        </Button>
    </div>
);

const BookingRequestsTab = () => (
    <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Booking Requests</h3>
        <p className="text-gray-500">No pending booking requests.</p>
    </div>
);

const ClientDatabaseTab = () => (
    <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6 bg-gray-100 rounded-full mb-4">
            <Building2 className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Client Database</h3>
        <p className="text-gray-500">Manage your client relationships here.</p>
    </div>
);

const TalentAvailabilityTab = ({ bookOuts, onAddBookOut, onRemoveBookOut }: any) => (
    <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Talent Availability</h3>
        <p className="text-gray-500 mb-6">Manage talent book-outs and availability.</p>
        <Button onClick={() => onAddBookOut?.({})} variant="outline" className="font-bold">
            Add Book Out
        </Button>
    </div>
);

const NotificationsTab = () => (
    <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6 bg-gray-100 rounded-full mb-4">
            <Bell className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Notifications</h3>
        <p className="text-gray-500">View booking-related notifications.</p>
    </div>
);

const ManagementAnalyticsView = ({ bookings }: any) => (
    <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6 bg-gray-100 rounded-full mb-4">
            <BarChart2 className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Management & Analytics</h3>
        <p className="text-gray-500">Analyze booking performance and revenue.</p>
    </div>
);

const BookingsView = ({
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

    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="p-6 bg-gray-100 rounded-full mb-4">
                <Calendar className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{activeSubTab}</h2>
            <p className="text-gray-500">Feature currently under development.</p>
        </div>
    );
};

export default BookingsView;
