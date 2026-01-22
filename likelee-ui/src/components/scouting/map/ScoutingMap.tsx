import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ScoutingProspect, ScoutingEvent } from "@/types/scouting";
import { scoutingService } from "@/services/scoutingService";
import { geocode } from "./geocoding";
import { MapMarkers } from "./MapMarkers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw, Navigation, Plus, Calendar, History, Share2, Link, Layers, Eye, EyeOff, TrendingUp, User, CheckCircle, Check, Plane, Diamond, Clock, Trash2 } from "lucide-react";
import { MapStats } from "./MapStats";
import { MapFilters } from "./MapFilters";
import { Checkbox } from "@/components/ui/checkbox";
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

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

// Helper component to handle map resizing when visibility changes
const ResizeMap = ({ isVisible }: { isVisible: boolean }) => {
    const map = useMap();
    useEffect(() => {
        if (isVisible) {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    }, [isVisible, map]);
    return null;
};

import MarkerClusterGroup from 'react-leaflet-cluster';

export const ScoutingMap = ({
    onEditEvent,
    onViewProspect,
    onAddEvent,
    onDeleteProspect,
    refreshData,
    isVisible = true
}: {
    onEditEvent?: (event: ScoutingEvent) => void;
    onViewProspect?: (prospect: ScoutingProspect) => void;
    onAddEvent?: () => void;
    onDeleteProspect?: (prospect: ScoutingProspect) => void;
    refreshData?: () => void;
    isVisible?: boolean;
}) => {
    const [prospects, setProspects] = useState<(ScoutingProspect & { coords: { lat: number; lng: number } })[]>([]);
    const [events, setEvents] = useState<(ScoutingEvent & { coords: { lat: number; lng: number } })[]>([]);
    const [trips, setTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [geocodingProgress, setGeocodingProgress] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [rawCounts, setRawCounts] = useState({
        totalDiscoveries: 0,
        signed: 0,
        prospects: 0,
        events: 0,
        trips: 0,
        declined: 0
    });

    // Modal states

    // Layer states
    const [layers, setLayers] = useState({
        discoveries: true,
        signedTalent: true,
        prospects: true,
        plannedTrips: true,
        events: true,
        heatmapDensity: false,
        heatmapSuccess: false,
        heatmapSocial: false,
        heatmapCompetition: false,
        demographics: false,
        optimizedRoutes: false,
        declined: true
    });

    const toggleLayer = (layer: keyof typeof layers) => {
        setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const agencyId = await scoutingService.getUserAgencyId();
            if (!agencyId) return;

            const [prospectData, eventData, tripData] = await Promise.all([
                scoutingService.getProspects(agencyId),
                scoutingService.getEvents(agencyId),
                scoutingService.getTrips(agencyId)
            ]);

            console.log(`Fetched ${prospectData.length} prospects, ${eventData.length} events, and ${tripData.length} trips`);
            setTrips(tripData);

            const signed = prospectData.filter(p => p.status === 'signed' || p.is_signed).length;
            const declined = prospectData.filter(p => p.status === 'declined').length;
            const prospectsCount = prospectData.length - signed - declined;

            setRawCounts({
                totalDiscoveries: prospectData.length,
                signed,
                prospects: prospectsCount,
                events: eventData.length,
                trips: tripData.length,
                declined
            });

            const totalItems = prospectData.length + eventData.length;
            let processedItems = 0;

            // Clear previous geocoded data to start fresh
            setProspects([]);
            setEvents([]);

            for (const p of prospectData) {
                const location = p.discovery_location;
                if (location) {
                    const coords = await geocode(location);
                    if (coords) {
                        const jitteredCoords = {
                            lat: coords.lat + (Math.random() - 0.5) * 0.0001,
                            lng: coords.lng + (Math.random() - 0.5) * 0.0001,
                        };
                        setProspects(prev => [...prev, { ...p, coords: jitteredCoords }]);
                    }
                }
                processedItems++;
                setGeocodingProgress(Math.round((processedItems / totalItems) * 100));
            }

            for (const e of eventData) {
                const location = e.location;
                if (location) {
                    console.log(`Geocoding event ${e.id} at location: ${location}`);
                    const coords = await geocode(location);
                    if (coords) {
                        console.log(`Successfully geocoded event ${e.id} to:`, coords);
                        const jitteredCoords = {
                            lat: coords.lat + (Math.random() - 0.5) * 0.0001,
                            lng: coords.lng + (Math.random() - 0.5) * 0.0001,
                        };
                        setEvents(prev => [...prev, { ...e, coords: jitteredCoords }]);
                    } else {
                        console.warn(`Failed to geocode event ${e.id} location: ${location}`);
                    }
                }
                processedItems++;
                setGeocodingProgress(Math.round((processedItems / totalItems) * 100));
            }
        } catch (error) {
            console.error("Failed to fetch map data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProspect = async (prospect: ScoutingProspect) => {
        if (!window.confirm(`Are you sure you want to delete ${prospect.full_name}?`)) return;

        try {
            await scoutingService.deleteProspect(prospect.id);
            fetchData();
            if (onDeleteProspect) onDeleteProspect(prospect);
        } catch (error) {
            console.error("Error deleting prospect:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const allCoords = [
        ...prospects.map(p => p.coords),
        ...events.map(e => e.coords),
        ...trips.map(t => ({ lat: t.latitude || 40.7128, lng: t.longitude || -74.0060 }))
    ];

    const signedProspects = prospects.filter(p => p.status === 'signed' || p.is_signed);
    const declinedProspects = prospects.filter(p => p.status === 'declined');
    const prospectsOnly = prospects.filter(p => p.status !== 'signed' && !p.is_signed && p.status !== 'declined');

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Scouting Map</h2>
                    <p className="text-sm text-gray-500 font-medium">Track discoveries, plan trips, and analyze scouting activity</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={onAddEvent}
                        className="h-10 rounded-xl border-gray-200 font-bold text-gray-700 flex items-center gap-2"
                    >
                        <Calendar className="w-4 h-4" /> Add Event
                    </Button>
                    <Button variant="outline" className="h-10 rounded-xl border-gray-200 font-bold text-gray-700 flex items-center gap-2">
                        <History className="w-4 h-4" /> Trip History (3)
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-100">
                    <Calendar className="w-3.5 h-3.5" /> Calendar Sync Enabled
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-[11px] font-bold border border-purple-100">
                    <Share2 className="w-3.5 h-3.5" /> Social Activity Tracked
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-[11px] font-bold border border-green-100">
                    <Link className="w-3.5 h-3.5" /> Linked to Pipeline
                </div>
            </div>

            <MapStats
                totalDiscoveries={rawCounts.totalDiscoveries}
                signed={rawCounts.signed}
                prospects={rawCounts.prospects}
                plannedTrips={rawCounts.trips}
                upcomingEvents={rawCounts.events}
            />

            <MapFilters />

            <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-3xl">
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-gray-400" /> Map Layers
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-[11px] font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1.5 h-8 px-3 rounded-lg bg-gray-50"
                        >
                            {showAdvanced ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {showAdvanced ? "Hide Advanced" : "Show Advanced"}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                            { id: 'discoveries', label: 'Total Discoveries', count: rawCounts.totalDiscoveries, icon: Layers, color: 'orange' },
                            { id: 'signedTalent', label: 'Signed Talent', count: rawCounts.signed, icon: User, color: 'blue' },
                            { id: 'prospects', label: 'Prospects', count: rawCounts.prospects, icon: Clock, color: 'amber' },
                            { id: 'declined', label: 'Declined', count: rawCounts.declined, icon: Clock, color: 'red' },
                            { id: 'plannedTrips', label: 'Planned Trips', count: rawCounts.trips, icon: Plane, color: 'purple' },
                            { id: 'events', label: 'Events', count: rawCounts.events, icon: Calendar, color: 'pink' }
                        ].map((layer) => {
                            const isSelected = layers[layer.id as keyof typeof layers];

                            // Define literal classes to avoid Tailwind JIT issues with dynamic interpolation
                            const colorClasses = {
                                orange: {
                                    bg: isSelected ? 'bg-orange-50 border-orange-200 ring-orange-100' : 'bg-white border-gray-100',
                                    iconBg: isSelected ? 'bg-orange-600 text-white shadow-orange-200' : 'bg-orange-100 text-orange-700',
                                    text: isSelected ? 'text-orange-900' : 'text-gray-700',
                                    subtext: isSelected ? 'text-orange-700' : 'text-gray-400',
                                    check: isSelected ? 'bg-orange-600 border-orange-600' : 'bg-white border-gray-200'
                                },
                                blue: {
                                    bg: isSelected ? 'bg-blue-50 border-blue-200 ring-blue-100' : 'bg-white border-gray-100',
                                    iconBg: isSelected ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-blue-100 text-blue-700',
                                    text: isSelected ? 'text-blue-900' : 'text-gray-700',
                                    subtext: isSelected ? 'text-blue-700' : 'text-gray-400',
                                    check: isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'
                                },
                                purple: {
                                    bg: isSelected ? 'bg-purple-50 border-purple-200 ring-purple-100' : 'bg-white border-gray-100',
                                    iconBg: isSelected ? 'bg-purple-600 text-white shadow-purple-200' : 'bg-purple-100 text-purple-700',
                                    text: isSelected ? 'text-purple-900' : 'text-gray-700',
                                    subtext: isSelected ? 'text-purple-700' : 'text-gray-400',
                                    check: isSelected ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-200'
                                },
                                amber: {
                                    bg: isSelected ? 'bg-amber-50 border-amber-200 ring-amber-100' : 'bg-white border-gray-100',
                                    iconBg: isSelected ? 'bg-amber-600 text-white shadow-amber-200' : 'bg-amber-100 text-amber-700',
                                    text: isSelected ? 'text-amber-900' : 'text-gray-700',
                                    subtext: isSelected ? 'text-amber-700' : 'text-gray-400',
                                    check: isSelected ? 'bg-amber-600 border-amber-600' : 'bg-white border-gray-200'
                                },
                                pink: {
                                    bg: isSelected ? 'bg-pink-50 border-pink-200 ring-pink-100' : 'bg-white border-gray-100',
                                    iconBg: isSelected ? 'bg-pink-600 text-white shadow-pink-200' : 'bg-pink-100 text-pink-700',
                                    text: isSelected ? 'text-pink-900' : 'text-gray-700',
                                    subtext: isSelected ? 'text-pink-700' : 'text-gray-400',
                                    check: isSelected ? 'bg-pink-600 border-pink-600' : 'bg-white border-gray-200'
                                },
                                red: {
                                    bg: isSelected ? 'bg-red-50 border-red-200 ring-red-100' : 'bg-white border-gray-100',
                                    iconBg: isSelected ? 'bg-red-600 text-white shadow-red-200' : 'bg-red-100 text-red-700',
                                    text: isSelected ? 'text-red-900' : 'text-gray-700',
                                    subtext: isSelected ? 'text-red-700' : 'text-gray-400',
                                    check: isSelected ? 'bg-red-600 border-red-600' : 'bg-white border-gray-200'
                                }
                            }[layer.color as 'orange' | 'blue' | 'purple' | 'pink' | 'amber' | 'red'];

                            return (
                                <button
                                    key={layer.id}
                                    onClick={() => toggleLayer(layer.id as keyof typeof layers)}
                                    className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-300 cursor-pointer ${colorClasses.bg} ${isSelected ? 'shadow-md ring-1 hover:shadow-lg hover:scale-[1.02]' : 'hover:border-gray-300 hover:shadow-md hover:scale-[1.02]'} active:scale-[0.98]`}
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className={`p-1.5 rounded-lg transition-all duration-300 flex-shrink-0 ${colorClasses.iconBg} ${isSelected ? 'shadow-lg' : ''}`}>
                                            <layer.icon className="w-3.5 h-3.5 stroke-[2.5px]" />
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className={`text-[10px] font-bold transition-colors duration-300 truncate ${colorClasses.text}`}>{layer.label}</p>
                                            <p className={`text-[9px] font-medium transition-colors duration-300 truncate ${colorClasses.subtext}`}>{layer.count} items</p>
                                        </div>
                                    </div>
                                    <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border transition-all duration-300 ${colorClasses.check} ${isSelected ? 'scale-110 shadow-sm' : 'scale-100'}`}>
                                        {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {showAdvanced && (
                        <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Heatmap Overlays</h4>
                                <div className="space-y-3">
                                    {[
                                        { id: 'heatmapDensity', label: 'Talent Density' },
                                        { id: 'heatmapSuccess', label: 'Discovery Success Rate' },
                                        { id: 'heatmapSocial', label: 'Social Media Activity' },
                                        { id: 'heatmapCompetition', label: 'Competition Territory' }
                                    ].map((overlay) => (
                                        <div key={overlay.id} className="flex items-center space-x-2">
                                            <Checkbox id={overlay.id} checked={layers[overlay.id as keyof typeof layers]} onCheckedChange={() => toggleLayer(overlay.id as keyof typeof layers)} />
                                            <label htmlFor={overlay.id} className="text-xs font-medium text-gray-600 cursor-pointer">{overlay.label}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Additional Layers</h4>
                                <div className="space-y-3">
                                    {[
                                        { id: 'demographics', label: 'Demographics & Trends' },
                                        { id: 'optimizedRoutes', label: 'Optimized Routes' }
                                    ].map((layer) => (
                                        <div key={layer.id} className="flex items-center space-x-2">
                                            <Checkbox id={layer.id} checked={layers[layer.id as keyof typeof layers]} onCheckedChange={() => toggleLayer(layer.id as keyof typeof layers)} />
                                            <label htmlFor={layer.id} className="text-xs font-medium text-gray-600 cursor-pointer">{layer.label}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 rounded-2xl h-[800px] border border-gray-200 relative overflow-hidden group">
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
                        center={[40.7128, -74.0060]}
                        zoom={12}
                        scrollWheelZoom={true}
                        className="h-full w-full z-0"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MarkerClusterGroup
                            chunkedLoading
                            spiderfyOnMaxZoom={true}
                            showCoverageOnHover={false}
                        >
                            <MapMarkers
                                prospects={layers.discoveries ? prospects.filter(p => {
                                    const isSigned = p.status === 'signed' || p.is_signed;
                                    const isDeclined = p.status === 'declined';
                                    if (isSigned && layers.signedTalent) return false;
                                    if (isDeclined && layers.declined) return false;
                                    if (!isSigned && !isDeclined && layers.prospects) return false;
                                    return true;
                                }) : []}
                                signedProspects={layers.signedTalent ? signedProspects : []}
                                prospectsOnly={layers.prospects ? prospectsOnly : []}
                                declinedProspects={layers.declined ? declinedProspects : []}
                                events={layers.events ? events : []}
                                trips={layers.plannedTrips ? trips : []}
                                onEditEvent={onEditEvent}
                                onViewProspect={onViewProspect}
                                onDeleteProspect={handleDeleteProspect}
                            />
                        </MarkerClusterGroup>
                        <RecenterMap coords={allCoords} />
                        <ResizeMap isVisible={isVisible} />
                    </MapContainer>

                    <div className="absolute bottom-6 right-6 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-xl">
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Legend</h5>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-orange-100 text-orange-700">
                                    <Layers className="w-3.5 h-3.5 stroke-[2.5px]" />
                                </div>
                                <span className="text-[11px] font-bold text-gray-700">Talent Discovery</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                                    <User className="w-3.5 h-3.5 stroke-[2.5px]" />
                                </div>
                                <span className="text-[11px] font-bold text-gray-700">Signed Talent</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                                    <Clock className="w-3.5 h-3.5 stroke-[2.5px]" />
                                </div>
                                <span className="text-[11px] font-bold text-gray-700">Prospect (Non-Signed)</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                                    <Plane className="w-3.5 h-3.5 stroke-[2.5px]" />
                                </div>
                                <span className="text-[11px] font-bold text-gray-700">Planned Trip</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-pink-100 text-pink-700">
                                    <Calendar className="w-3.5 h-3.5 stroke-[2.5px]" />
                                </div>
                                <span className="text-[11px] font-bold text-gray-700">Event</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-red-100 text-red-700">
                                    <Clock className="w-3.5 h-3.5 stroke-[2.5px]" />
                                </div>
                                <span className="text-[11px] font-bold text-gray-700">Declined Prospect</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>


        </div>
    );
};
