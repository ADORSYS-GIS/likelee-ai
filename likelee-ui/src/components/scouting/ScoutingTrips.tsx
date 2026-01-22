import React, { useState } from "react";
import {
    Calendar,
    Users,
    Cloud,
    ChevronDown,
    ChevronUp,
    MapPin,
    Camera,
    FileText,
    Star,
    Plus,
    ArrowUpRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoutingTrip, ScoutingTripLocation } from "@/types/scouting";
import { PlanTripModal } from "./map/PlanTripModal";

const MOCK_TRIPS: ScoutingTrip[] = [
    {
        id: "1",
        agency_id: "agency_1",
        name: "NYC SoHo Holiday Scouting",
        status: "completed",
        trip_type: "Open Scouting",
        start_date: "2025-12-15",
        end_date: "2025-12-17",
        location: "New York, NY",
        scout_ids: ["Sarah Johnson", "Michael Lee"],
        weather: "Clear, 35°F",
        prospects_approached: 45,
        prospects_added: 14,
        prospects_agreed: 17, // Using this for "Submitted" in the UI
        conversion_rate: 31.1,
        total_cost: 2350,
        description: "Holiday shopping season proved excellent for foot traffic. SoHo was especially productive with fashion-forward crowds. Weather was cold but clear.",
        locations_visited: [
            { id: "l1", name: "SoHo Shopping District", date: "Dec 15", time: "10:00 AM", prospects_found: 8 },
            { id: "l2", name: "NYU Campus Area", date: "Dec 15", time: "2:30 PM", prospects_found: 5 },
            { id: "l3", name: "Chelsea Fitness Centers", date: "Dec 16", time: "11:00 AM", prospects_found: 4 },
        ],
        photos: [
            "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=200&fit=crop",
            "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=200&fit=crop"
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: "2",
        agency_id: "agency_1",
        name: "Brooklyn Art District Tour",
        status: "completed",
        trip_type: "Specific Casting",
        start_date: "2025-11-20",
        end_date: "2025-11-21",
        location: "Brooklyn, NY",
        scout_ids: ["Michael Lee"],
        weather: "Partly cloudy, 52°F",
        prospects_approached: 28,
        prospects_added: 8,
        prospects_agreed: 10,
        conversion_rate: 28.6,
        total_cost: 1420,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: "3",
        agency_id: "agency_1",
        name: "Chicago Fashion Week",
        status: "completed",
        trip_type: "Event Coverage",
        start_date: "2025-10-05",
        end_date: "2025-10-08",
        location: "Chicago, IL",
        scout_ids: ["Sarah Johnson"],
        weather: "Sunny, 65°F",
        prospects_approached: 52,
        prospects_added: 18,
        prospects_agreed: 21,
        conversion_rate: 34.6,
        total_cost: 4280,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

const TripCard = ({ trip, onEdit }: { trip: ScoutingTrip; onEdit: (trip: ScoutingTrip) => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "bg-green-100 text-green-700";
            case "ongoing": return "bg-blue-100 text-blue-700";
            case "planned": return "bg-amber-100 text-amber-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <Card
            className={`mb-4 overflow-hidden transition-all duration-300 border-gray-200 shadow-sm hover:shadow-md cursor-pointer ${isExpanded ? 'ring-1 ring-indigo-100' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900">{trip.name}</h3>
                            <Badge className={`${getStatusColor(trip.status)} hover:${getStatusColor(trip.status)} border-none capitalize`}>
                                {trip.status}
                            </Badge>
                            {trip.trip_type && (
                                <Badge variant="outline" className="text-gray-600 border-gray-200 font-medium">
                                    {trip.trip_type}
                                </Badge>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>{trip.start_date} - {trip.end_date}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                <span>{trip.scout_ids?.join(", ")}</span>
                            </div>
                            {trip.weather && (
                                <div className="flex items-center gap-1.5">
                                    <Cloud className="w-4 h-4" />
                                    <span>{trip.weather}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-gray-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Approached</p>
                        <p className="text-xl font-bold text-gray-900">{trip.prospects_approached}</p>
                    </div>
                    <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Submitted</p>
                        <p className="text-xl font-bold text-indigo-600">{trip.prospects_agreed}</p>
                    </div>
                    <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Added to Pipeline</p>
                        <p className="text-xl font-bold text-green-600">{trip.prospects_added}</p>
                    </div>
                    <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Conversion Rate</p>
                        <p className="text-xl font-bold text-purple-600">{trip.conversion_rate}%</p>
                    </div>
                    <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Total Cost</p>
                        <p className="text-xl font-bold text-gray-900">${trip.total_cost?.toLocaleString()}</p>
                    </div>
                </div>

                {isExpanded && (
                    <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Locations Visited */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-orange-600">
                                <MapPin className="w-4 h-4" />
                                <h4 className="font-bold text-sm uppercase tracking-wider">Locations Visited ({trip.locations_visited?.length || 0})</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {trip.locations_visited?.map((loc) => (
                                    <div key={loc.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{loc.name}</p>
                                            <p className="text-[10px] text-gray-400">{loc.date}, {loc.time}</p>
                                        </div>
                                        <Badge className="bg-green-50 text-green-700 border-green-100 hover:bg-green-50">
                                            {loc.prospects_found} found
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Trip Photos */}
                        {trip.photos && trip.photos.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-4 text-blue-600">
                                    <Camera className="w-4 h-4" />
                                    <h4 className="font-bold text-sm uppercase tracking-wider">Trip Photos ({trip.photos.length})</h4>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                    {trip.photos.map((photo, i) => (
                                        <img
                                            key={i}
                                            src={photo}
                                            alt={`Trip photo ${i + 1}`}
                                            className="w-48 h-32 object-cover rounded-xl border border-gray-100 shadow-sm"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {trip.description && (
                            <div>
                                <div className="flex items-center gap-2 mb-4 text-gray-600">
                                    <FileText className="w-4 h-4" />
                                    <h4 className="font-bold text-sm uppercase tracking-wider">Notes & Observations</h4>
                                </div>
                                <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl text-sm text-gray-600 leading-relaxed">
                                    {trip.description}
                                </div>
                            </div>
                        )}

                        {/* Edit Button */}
                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(trip);
                                }}
                                className="bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-100 rounded-xl px-6 flex items-center gap-2 font-bold"
                            >
                                <ArrowUpRight className="w-4 h-4" />
                                View Details & Update
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export const ScoutingTrips = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTrip, setEditingTrip] = useState<ScoutingTrip | null>(null);

    const handleEdit = (trip: ScoutingTrip) => {
        setEditingTrip(trip);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTrip(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Scouting Trips</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage and track your field scouting missions</p>
                </div>
                <Button
                    onClick={() => {
                        setEditingTrip(null);
                        setIsModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 shadow-lg shadow-indigo-100 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Plan New Trip
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {MOCK_TRIPS.map((trip) => (
                    <TripCard key={trip.id} trip={trip} onEdit={handleEdit} />
                ))}
            </div>

            <PlanTripModal
                isOpen={isModalOpen}
                initialData={editingTrip}
                onClose={handleCloseModal}
                onPlan={(trip) => {
                    console.log(editingTrip ? "Trip updated:" : "New trip planned:", trip);
                    handleCloseModal();
                }}
            />
        </div>
    );
};
