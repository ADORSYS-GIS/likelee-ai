import React from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { ScoutingProspect, ScoutingEvent } from "@/types/scouting";
import { ProspectPopup, EventPopup } from "./MapPopups";
import { Star, Clock } from "lucide-react";

const createCustomIcon = (color: string, iconType: 'prospect' | 'event' | 'signed' | 'trip' | 'prospect-only') => {
    let iconSvg = '';
    // Using bolder paths and higher stroke-width for visibility
    if (iconType === 'prospect') {
        // Discovery icon (Stack/Diamond-like) - Bolder
        iconSvg = '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    } else if (iconType === 'signed') {
        // User icon - Bolder
        iconSvg = '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="white" stroke-width="3"/>';
    } else if (iconType === 'event') {
        // Calendar icon - Bolder
        iconSvg = '<rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="white" stroke-width="3"/><line x1="16" y1="2" x2="16" y2="6" stroke="white" stroke-width="3"/><line x1="8" y1="2" x2="8" y2="6" stroke="white" stroke-width="3"/><line x1="3" y1="10" x2="21" y2="10" stroke="white" stroke-width="3"/>';
    } else if (iconType === 'trip') {
        // Plane icon - Bolder and more defined
        iconSvg = '<path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 2H4l-1 1 3 2 2 3 1-1v-3l2-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="white" fill-opacity="0.3"/>';
    } else if (iconType === 'prospect-only') {
        // Clock icon - Bolder
        iconSvg = '<circle cx="12" cy="12" r="10" stroke="white" stroke-width="3"/><polyline points="12 6 12 12 16 14" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    }

    return L.divIcon({
        html: `
            <div style="
                background-color: ${color}; 
                width: 42px; 
                height: 42px; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                border: 3px solid white; 
                box-shadow: 0 4px 15px ${color}66, 0 2px 4px rgba(0,0,0,0.2); 
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;
            " class="marker-hover-effect">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
                    ${iconSvg}
                </svg>
            </div>
            <style>
                .marker-hover-effect:hover {
                    transform: scale(1.2) translateY(-3px);
                    box-shadow: 0 10px 30px ${color}99, 0 5px 10px rgba(0,0,0,0.3);
                    z-index: 1000 !important;
                }
            </style>
        `,
        className: "custom-map-marker",
        iconSize: [42, 42],
        iconAnchor: [21, 21],
        popupAnchor: [0, -21],
    });
};

const ProspectIcon = createCustomIcon("#ea580c", "prospect"); // Orange-600
const SignedIcon = createCustomIcon("#2563eb", "signed");     // Blue-600
const ProspectOnlyIcon = createCustomIcon("#d97706", "prospect-only"); // Amber-600
const EventIcon = createCustomIcon("#db2777", "event"); // Pink-600 - Single icon for all events
const PlannedTripIcon = createCustomIcon("#7c3aed", "trip");   // Purple-600
const DeclinedIcon = createCustomIcon("#dc2626", "prospect-only"); // Red-600

interface MapMarkersProps {
    prospects: (ScoutingProspect & { coords: { lat: number; lng: number } })[];
    signedProspects?: (ScoutingProspect & { coords: { lat: number; lng: number } })[];
    prospectsOnly?: (ScoutingProspect & { coords: { lat: number; lng: number } })[];
    events: (ScoutingEvent & { coords: { lat: number; lng: number } })[];
    trips?: any[];
    declinedProspects?: (ScoutingProspect & { coords: { lat: number; lng: number } })[];
    onEditEvent?: (event: ScoutingEvent) => void;
    onViewProspect?: (prospect: ScoutingProspect) => void;
    onDeleteProspect?: (prospect: ScoutingProspect) => void;
}

export const MapMarkers = ({ prospects, signedProspects = [], prospectsOnly = [], events, trips = [], declinedProspects = [], onEditEvent, onViewProspect, onDeleteProspect }: MapMarkersProps) => {
    return (
        <>
            {prospects.map((prospect) => (
                <Marker
                    key={`prospect-${prospect.id}`}
                    position={[prospect.coords.lat, prospect.coords.lng]}
                    icon={ProspectIcon}
                >
                    <Popup autoClose={false} closeOnClick={false}>
                        <ProspectPopup
                            prospect={prospect}
                            onView={onViewProspect}
                            onDelete={onDeleteProspect}
                        />
                    </Popup>
                </Marker>
            ))}

            {signedProspects.map((prospect) => (
                <Marker
                    key={`signed-${prospect.id}`}
                    position={[prospect.coords.lat, prospect.coords.lng]}
                    icon={SignedIcon}
                >
                    <Popup autoClose={false} closeOnClick={false}>
                        <ProspectPopup
                            prospect={prospect}
                            onView={onViewProspect}
                            onDelete={onDeleteProspect}
                        />
                    </Popup>
                </Marker>
            ))}

            {prospectsOnly.map((prospect) => (
                <Marker
                    key={`prospect-only-${prospect.id}`}
                    position={[prospect.coords.lat, prospect.coords.lng]}
                    icon={ProspectOnlyIcon}
                >
                    <Popup autoClose={false} closeOnClick={false}>
                        <ProspectPopup
                            prospect={prospect}
                            onView={onViewProspect}
                        />
                    </Popup>
                </Marker>
            ))}

            {events.map((event) => (
                <Marker
                    key={`event-${event.id}`}
                    position={[event.coords.lat, event.coords.lng]}
                    icon={EventIcon}
                >
                    <Popup autoClose={false} closeOnClick={false}>
                        <EventPopup
                            event={event}
                            onEdit={onEditEvent}
                        />
                    </Popup>
                </Marker>
            ))}

            {trips.map((trip) => (
                <Marker
                    key={`trip-${trip.id}`}
                    position={[trip.latitude || 40.7128, trip.longitude || -74.0060]}
                    icon={PlannedTripIcon}
                >
                    <Popup autoClose={false} closeOnClick={false}>
                        <div className="p-2">
                            <h4 className="font-bold text-sm">{trip.name}</h4>
                            <p className="text-xs text-gray-500">{trip.destination}</p>
                            <p className="text-[10px] text-indigo-600 mt-1">{trip.start_date} - {trip.end_date}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {declinedProspects.map((prospect) => (
                <Marker
                    key={`declined-${prospect.id}`}
                    position={[prospect.coords.lat, prospect.coords.lng]}
                    icon={DeclinedIcon}
                >
                    <Popup autoClose={false} closeOnClick={false}>
                        <ProspectPopup
                            prospect={prospect}
                            onView={onViewProspect}
                        />
                    </Popup>
                </Marker>
            ))}
        </>
    );
};
