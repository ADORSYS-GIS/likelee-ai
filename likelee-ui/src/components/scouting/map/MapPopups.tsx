import React from "react";
import {
  ScoutingProspect,
  ScoutingEvent,
  ScoutingTrip,
} from "@/types/scouting";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  User,
  Instagram,
  Mail,
  Phone,
  Trash2,
  Target,
  DollarSign,
  Users,
} from "lucide-react";

// Format prospect status for display
const formatProspectStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    new: "New Lead",
    contacted: "Contacted",
    meeting: "Meeting Scheduled",
    test_shoot: "Test Shoot",
    offer_sent: "Offer Sent",
    signed: "Signed",
    declined: "Declined",
  };
  return statusMap[status] || status;
};

export const ProspectPopup = ({
  prospect,
  onView,
  onDelete,
}: {
  prospect: ScoutingProspect;
  onView?: (prospect: ScoutingProspect) => void;
  onDelete?: (prospect: ScoutingProspect) => void;
}) => (
  <div className="p-1 min-w-[200px]">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
        {prospect.full_name.charAt(0)}
      </div>
      <div>
        <h4 className="font-bold text-gray-900 text-sm leading-tight">
          {prospect.full_name}
        </h4>
        <Badge
          variant="secondary"
          className="text-[9px] px-1.5 py-0 h-4 bg-gray-100 text-gray-600"
        >
          {formatProspectStatus(prospect.status)}
        </Badge>
      </div>
    </div>

    <div className="space-y-1.5 text-[11px] text-gray-600">
      {prospect.instagram_handle && (
        <div className="flex items-center gap-1.5">
          <Instagram className="w-3 h-3 text-gray-400" />
          <span>{prospect.instagram_handle}</span>
        </div>
      )}
      {prospect.email && (
        <div className="flex items-center gap-1.5">
          <Mail className="w-3 h-3 text-gray-400" />
          <span className="truncate max-w-[150px]">{prospect.email}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <MapPin className="w-3 h-3 text-gray-400" />
        <span>{prospect.discovery_location || "Unknown"}</span>
      </div>
    </div>

    <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onDelete?.(prospect)}
          className={`p-1.5 rounded-lg transition-colors ${
            prospect.status === "declined"
              ? "text-red-500 hover:text-red-700 hover:bg-red-50"
              : "text-gray-400 hover:text-red-600 hover:bg-red-50"
          }`}
          title="Delete Prospect"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] text-gray-400 font-medium">Prospect</span>
      </div>
      <button
        onClick={() => onView?.(prospect)}
        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
      >
        View Profile
      </button>
    </div>
  </div>
);

export const EventPopup = ({
  event,
  onEdit,
}: {
  event: ScoutingEvent;
  onEdit?: (event: ScoutingEvent) => void;
}) => (
  <div className="p-1 min-w-[200px]">
    <div className="mb-2">
      <Badge className="mb-1 text-[9px] px-1.5 py-0 h-4 bg-green-50 text-green-700 border-green-100">
        {event.status}
      </Badge>
      <h4 className="font-bold text-gray-900 text-sm leading-tight">
        {event.name}
      </h4>
    </div>

    <div className="space-y-1.5 text-[11px] text-gray-600">
      <div className="flex items-center gap-1.5">
        <Calendar className="w-3 h-3 text-gray-400" />
        <span>{new Date(event.event_date).toLocaleDateString()}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <MapPin className="w-3 h-3 text-gray-400" />
        <span className="truncate max-w-[150px]">{event.location}</span>
      </div>
    </div>

    <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center">
      <span className="text-[10px] text-gray-400 font-medium">Event</span>
      <button
        onClick={() => onEdit?.(event)}
        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
      >
        Edit Details
      </button>
    </div>
  </div>
);

export const TripPopup = ({ trip }: { trip: ScoutingTrip }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "ongoing":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "planned":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const formatDateRange = (start?: string, end?: string) => {
    if (!start) return "TBD";
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;

    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    const startStr = startDate.toLocaleDateString("en-US", options);

    if (!endDate) return startStr;

    const endStr = endDate.toLocaleDateString("en-US", options);
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className="p-2 min-w-[260px] font-sans">
      <div className="mb-4">
        <h4 className="font-black text-gray-900 text-base leading-tight mb-2">
          {trip.name}
        </h4>
        <Badge
          className={`${getStatusColor(trip.status)} border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider`}
        >
          {trip.status}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 font-bold">Dates:</span>
          <span className="font-black text-gray-900">
            {formatDateRange(trip.start_date, trip.end_date)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 font-bold">Target Goal:</span>
          <span className="font-black text-gray-900">
            {trip.prospects_added || 0} prospects
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 font-bold">Budget:</span>
          <span className="font-black text-gray-900">
            ${trip.total_cost?.toLocaleString() || "0"}
          </span>
        </div>

        <div className="pt-2">
          <p className="text-gray-500 font-bold text-sm mb-2">Scouts:</p>
          <div className="flex flex-wrap gap-2">
            {trip.scout_names && trip.scout_names.length > 0 ? (
              trip.scout_names.map((scout, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="bg-indigo-50 text-indigo-700 border-indigo-100 font-black text-[10px] px-2 py-1 rounded-lg"
                >
                  {scout}
                </Badge>
              ))
            ) : (
              <span className="text-[10px] text-gray-400 font-medium italic">
                No scouts assigned
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
