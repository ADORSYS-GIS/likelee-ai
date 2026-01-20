import React from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { ScoutingProspect, ScoutingEvent } from "@/types/scouting";
import { ProspectPopup, EventPopup } from "./MapPopups";

const createCustomIcon = (color: string) => L.divIcon({
    html: `
        <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 40 15 40C15 40 30 26.25 30 15C30 6.71573 23.2843 0 15 0Z" fill="${color}"/>
            <circle cx="15" cy="15" r="6" fill="white"/>
        </svg>
    `,
    className: "custom-map-marker",
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40],
});

const ProspectIcon = createCustomIcon("#4f46e5"); // Indigo-600
const EventIcon = createCustomIcon("#10b981");    // Emerald-500

L.Marker.prototype.options.icon = ProspectIcon;

interface MapMarkersProps {
    prospects: (ScoutingProspect & { coords: { lat: number; lng: number } })[];
    events: (ScoutingEvent & { coords: { lat: number; lng: number } })[];
    onEditEvent?: (event: ScoutingEvent) => void;
    onViewProspect?: (prospect: ScoutingProspect) => void;
}

export const MapMarkers = ({ prospects, events, onEditEvent, onViewProspect }: MapMarkersProps) => {
    return (
        <>
            {prospects.map((prospect) => (
                <Marker
                    key={`prospect-${prospect.id}`}
                    position={[prospect.coords.lat, prospect.coords.lng]}
                    icon={ProspectIcon}
                >
                    <Popup>
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
                    <Popup>
                        <EventPopup
                            event={event}
                            onEdit={onEditEvent}
                        />
                    </Popup>
                </Marker>
            ))}
        </>
    );
};
