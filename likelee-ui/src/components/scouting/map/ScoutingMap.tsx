import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ScoutingProspect, ScoutingEvent } from "@/types/scouting";
import { scoutingService } from "@/services/scoutingService";
import { geocode } from "./geocoding";
import { MapMarkers } from "./MapMarkers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw, Navigation } from "lucide-react";

// Helper component to center map on markers
const RecenterMap = ({ coords }: { coords: { lat: number; lng: number }[] }) => {
    const map = useMap();
    useEffect(() => {
        if (coords.length > 0) {
            const bounds = L.latLngBounds(coords.map(c => [c.lat, c.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [coords, map]);
    return null;
};

export const ScoutingMap = ({
    onEditEvent,
    onViewProspect
}: {
    onEditEvent?: (event: ScoutingEvent) => void;
    onViewProspect?: (prospect: ScoutingProspect) => void;
}) => {
    const [prospects, setProspects] = useState<(ScoutingProspect & { coords: { lat: number; lng: number } })[]>([]);
    const [events, setEvents] = useState<(ScoutingEvent & { coords: { lat: number; lng: number } })[]>([]);
    const [loading, setLoading] = useState(true);
    const [geocodingProgress, setGeocodingProgress] = useState(0);

    const fetchData = async () => {
        try {
            setLoading(true);
            const agencyId = await scoutingService.getUserAgencyId();
            if (!agencyId) return;

            const [prospectData, eventData] = await Promise.all([
                scoutingService.getProspects(agencyId),
                scoutingService.getEvents(agencyId)
            ]);

            console.log(`Fetched ${prospectData.length} prospects and ${eventData.length} events`);

            const totalItems = prospectData.length + eventData.length;
            let processedItems = 0;

            const geocodedProspects = [];
            for (const p of prospectData) {
                const location = p.discovery_location;
                if (location) {
                    const coords = await geocode(location);
                    if (coords) {
                        // Add slight jitter to prevent perfect overlap
                        const jitteredCoords = {
                            lat: coords.lat + (Math.random() - 0.5) * 0.0001,
                            lng: coords.lng + (Math.random() - 0.5) * 0.0001,
                        };
                        geocodedProspects.push({ ...p, coords: jitteredCoords });
                    } else {
                        console.warn(`Failed to geocode prospect location: ${location}`);
                    }
                }
                processedItems++;
                setGeocodingProgress(Math.round((processedItems / totalItems) * 100));
            }

            const geocodedEvents = [];
            for (const e of eventData) {
                const location = e.location;
                if (location) {
                    const coords = await geocode(location);
                    if (coords) {
                        // Add slight jitter to prevent perfect overlap
                        const jitteredCoords = {
                            lat: coords.lat + (Math.random() - 0.5) * 0.0001,
                            lng: coords.lng + (Math.random() - 0.5) * 0.0001,
                        };
                        geocodedEvents.push({ ...e, coords: jitteredCoords });
                    } else {
                        console.warn(`Failed to geocode event location: ${location}`);
                    }
                }
                processedItems++;
                setGeocodingProgress(Math.round((processedItems / totalItems) * 100));
            }

            console.log(`Geocoded ${geocodedProspects.length} prospects and ${geocodedEvents.length} events`);
            setProspects(geocodedProspects);
            setEvents(geocodedEvents);
        } catch (error) {
            console.error("Failed to fetch map data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const allCoords = [...prospects.map(p => p.coords), ...events.map(e => e.coords)];

    return (
        <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-3xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Scouting Map</h2>
                    <p className="text-xs text-gray-500 font-medium">Visualize your talent discovery and events globally</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={fetchData}
                        disabled={loading}
                        className="font-bold text-gray-700 px-6 h-11 rounded-xl shadow-sm border-gray-300 flex items-center gap-2"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                        Refresh Map
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 h-11 rounded-xl shadow-sm">
                        Plan New Trip
                    </Button>
                </div>
            </div>

            <div className="bg-gray-50 rounded-2xl h-[600px] border border-gray-200 relative overflow-hidden group">
                {loading && (
                    <div className="absolute inset-0 z-[1000] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
                        <div className="p-6 bg-white rounded-full mb-4 shadow-sm">
                            <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Geocoding Locations...</h3>
                        <p className="text-sm text-gray-500 max-w-xs">
                            We're mapping your {prospects.length + events.length} talent leads and events.
                        </p>
                        <div className="w-64 h-2 bg-gray-100 rounded-full mt-6 overflow-hidden">
                            <div
                                className="h-full bg-indigo-600 transition-all duration-300"
                                style={{ width: `${geocodingProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                <MapContainer
                    center={[20, 0]}
                    zoom={2}
                    scrollWheelZoom={true}
                    className="h-full w-full z-0"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapMarkers
                        prospects={prospects}
                        events={events}
                        onEditEvent={onEditEvent}
                        onViewProspect={onViewProspect}
                    />
                    <RecenterMap coords={allCoords} />
                </MapContainer>

                {!loading && allCoords.length === 0 && (
                    <div className="absolute inset-0 z-[1000] bg-gray-50/50 flex flex-col items-center justify-center text-center p-6">
                        <div className="p-6 bg-white rounded-full mb-4 shadow-sm">
                            <MapPin className="w-12 h-12 text-gray-200" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">No Locations Mapped</h3>
                        <p className="text-sm text-gray-500 max-w-xs">
                            Add prospects with discovery locations or create events with addresses to see them on the map.
                        </p>
                    </div>
                )}
            </div>
        </Card>
    );
};
