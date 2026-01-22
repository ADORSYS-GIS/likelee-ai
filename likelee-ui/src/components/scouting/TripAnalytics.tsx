import React from "react";
import { Card } from "@/components/ui/card";
import {
    TrendingUp,
    Users,
    Target,
    DollarSign,
    MapPin,
    Activity,
    Award,
    ArrowUpRight,
    BarChart3
} from "lucide-react";
import { ScoutingTrip } from "@/types/scouting";

interface TripAnalyticsProps {
    trips: ScoutingTrip[];
}

export const TripAnalytics = ({ trips }: TripAnalyticsProps) => {
    // Calculate metrics
    const totalTrips = trips.length;
    const totalProspects = trips.reduce((acc, trip) => acc + (trip.prospects_added || 0), 0);
    const avgConversion = trips.length > 0
        ? (trips.reduce((acc, trip) => acc + (trip.conversion_rate || 0), 0) / trips.length).toFixed(1)
        : 0;
    const totalInvestment = trips.reduce((acc, trip) => acc + (trip.total_cost || 0), 0);

    // Scout Performance (Mocked/Calculated)
    const scoutStats = [
        { name: "Sarah Johnson", trips: 2, prospects: 32, conversion: "33.0%", rank: 1 },
        { name: "Michael Lee", trips: 2, prospects: 22, conversion: "30.1%", rank: 2 }
    ];

    // Productive Locations (Mocked/Calculated)
    const locations = [
        { name: "Chicago Fashion Week Venue", visits: 1, rate: "12.0/visit", total: 12 },
        { name: "Downtown Shopping District", visits: 1, rate: "9.0/visit", total: 9 },
        { name: "SoHo Shopping District", visits: 1, rate: "8.0/visit", total: 8 }
    ];

    // ROI by Trip Type (Mocked/Calculated)
    const roiStats = [
        { type: "Open Scouting", trips: 1, prospects: 14, costPer: "$168/prospect" },
        { type: "Specific Casting", trips: 1, prospects: 8, costPer: "$178/prospect" },
        { type: "Event Coverage", trips: 1, prospects: 18, costPer: "$238/prospect" }
    ];

    return (
        <Card className="p-6 bg-indigo-50/30 border-indigo-100 shadow-sm rounded-[32px] space-y-6">
            <div className="flex items-center gap-2 text-indigo-700">
                <TrendingUp className="w-5 h-5" />
                <h3 className="text-lg font-black tracking-tight">Trip Analytics Overview</h3>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-indigo-50 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Trips</p>
                    <p className="text-3xl font-black text-indigo-600">{totalTrips}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-indigo-50 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Prospects Discovered</p>
                    <p className="text-3xl font-black text-emerald-600">{totalProspects}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-indigo-50 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Conversion Rate</p>
                    <p className="text-3xl font-black text-purple-600">{avgConversion}%</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-indigo-50 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Investment</p>
                    <p className="text-3xl font-black text-gray-900">${totalInvestment.toLocaleString()}</p>
                </div>
            </div>

            {/* Bottom Details Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Scout Performance */}
                <div className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-sm space-y-4">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Scout Performance</h4>
                    <div className="space-y-3">
                        {scoutStats.map((scout) => (
                            <div key={scout.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${scout.rank === 1 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {scout.rank}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-gray-900">{scout.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold">{scout.trips} trips</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-emerald-600">{scout.prospects}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{scout.conversion}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Most Productive Locations */}
                <div className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-sm space-y-4">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Most Productive Locations</h4>
                    <div className="space-y-3">
                        {locations.map((loc) => (
                            <div key={loc.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <MapPin className="w-4 h-4 text-orange-500" />
                                    <div>
                                        <p className="text-xs font-black text-gray-900 truncate max-w-[120px]">{loc.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold">{loc.visits} visits</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-orange-600">{loc.total}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{loc.rate}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ROI by Trip Type */}
                <div className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-sm space-y-4">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">ROI by Trip Type</h4>
                    <div className="space-y-3">
                        {roiStats.map((roi) => (
                            <div key={roi.type} className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black text-gray-900">{roi.type}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{roi.trips} trips</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-purple-600">{roi.prospects}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{roi.costPer}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
};
