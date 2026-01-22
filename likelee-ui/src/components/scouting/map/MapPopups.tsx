import React from "react";
import { ScoutingProspect, ScoutingEvent } from "@/types/scouting";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User, Instagram, Mail, Phone, Trash2 } from "lucide-react";

// Format prospect status for display
const formatProspectStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
        'new': 'New Lead',
        'contacted': 'Contacted',
        'meeting': 'Meeting Scheduled',
        'test_shoot': 'Test Shoot',
        'offer_sent': 'Offer Sent',
        'signed': 'Signed',
        'declined': 'Declined'
    };
    return statusMap[status] || status;
};

export const ProspectPopup = ({
    prospect,
    onView,
    onDelete
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
                <h4 className="font-bold text-gray-900 text-sm leading-tight">{prospect.full_name}</h4>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-gray-100 text-gray-600">
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
                    className={`p-1.5 rounded-lg transition-colors ${prospect.status === 'declined'
                        ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
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
    onEdit
}: {
    event: ScoutingEvent;
    onEdit?: (event: ScoutingEvent) => void;
}) => (
    <div className="p-1 min-w-[200px]">
        <div className="mb-2">
            <Badge className="mb-1 text-[9px] px-1.5 py-0 h-4 bg-green-50 text-green-700 border-green-100">
                {event.status}
            </Badge>
            <h4 className="font-bold text-gray-900 text-sm leading-tight">{event.name}</h4>
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
