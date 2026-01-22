import React from "react";
import { Card } from "@/components/ui/card";
import { Layers, User, Calendar, CheckCircle, Plane, Clock } from "lucide-react";

interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ElementType;
    iconColor: string;
    bgColor: string;
}

const StatCard = ({ label, value, icon: Icon, iconColor, bgColor }: StatCardProps) => (
    <Card className="p-4 flex flex-col gap-1 border-gray-100 shadow-sm rounded-xl">
        <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${bgColor}`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        </div>
        <div className="text-2xl font-black text-gray-900 mt-1">{value}</div>
    </Card>
);

interface MapStatsProps {
    totalDiscoveries: number;
    signed: number;
    prospects: number;
    scoutingTrips: number;
    upcomingEvents: number;
}

export const MapStats = ({ totalDiscoveries, signed, prospects, scoutingTrips, upcomingEvents }: MapStatsProps) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard
                label="Total Discoveries"
                value={totalDiscoveries}
                icon={Layers}
                iconColor="text-orange-600"
                bgColor="bg-orange-50"
            />
            <StatCard
                label="Signed"
                value={signed}
                icon={User}
                iconColor="text-blue-600"
                bgColor="bg-blue-50"
            />
            <StatCard
                label="Prospects"
                value={prospects}
                icon={Clock}
                iconColor="text-amber-600"
                bgColor="bg-amber-50"
            />
            <StatCard
                label="Scouting Trips"
                value={scoutingTrips}
                icon={Plane}
                iconColor="text-purple-600"
                bgColor="bg-purple-50"
            />
            <StatCard
                label="Upcoming Events"
                value={upcomingEvents}
                icon={Calendar}
                iconColor="text-pink-600"
                bgColor="bg-pink-50"
            />
        </div>
    );
};
