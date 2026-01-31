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
  BarChart3,
} from "lucide-react";
import { ScoutingTrip } from "@/types/scouting";

interface TripAnalyticsProps {
  trips: ScoutingTrip[];
}

export const TripAnalytics = ({ trips }: TripAnalyticsProps) => {
  // Calculate metrics
  const totalTrips = trips.length;
  const totalProspects = trips.reduce(
    (acc, trip) => acc + (trip.prospects_added || 0),
    0,
  );
  const avgConversion =
    trips.length > 0
      ? (
          trips.reduce((acc, trip) => acc + (trip.conversion_rate || 0), 0) /
          trips.length
        ).toFixed(1)
      : 0;
  const totalInvestment = trips.reduce(
    (acc, trip) => acc + (trip.total_cost || 0),
    0,
  );

  // Scout Performance (Calculated)
  const scoutMap: Record<
    string,
    { trips: number; prospects: number; totalConversion: number }
  > = {};
  trips.forEach((trip) => {
    const scouts = trip.scout_names || trip.scout_ids || [];
    scouts.forEach((name) => {
      if (!scoutMap[name]) {
        scoutMap[name] = { trips: 0, prospects: 0, totalConversion: 0 };
      }
      scoutMap[name].trips += 1;
      // Distribute prospects among scouts for this trip?
      // For now, let's attribute full trip prospects to each scout on the trip
      scoutMap[name].prospects += trip.prospects_added || 0;
      scoutMap[name].totalConversion += trip.conversion_rate || 0;
    });
  });

  const scoutStats = Object.entries(scoutMap)
    .map(([name, stats]) => ({
      name,
      trips: stats.trips,
      prospects: stats.prospects,
      conversion:
        stats.trips > 0
          ? (stats.totalConversion / stats.trips).toFixed(1) + "%"
          : "0%",
    }))
    .sort((a, b) => b.prospects - a.prospects)
    .map((stat, index) => ({ ...stat, rank: index + 1 }))
    .slice(0, 5);

  // Productive Locations (Calculated)
  const locationMap: Record<string, { visits: number; prospects: number }> = {};
  trips.forEach((trip) => {
    if (trip.locations_visited && trip.locations_visited.length > 0) {
      trip.locations_visited.forEach((loc) => {
        if (!locationMap[loc.name]) {
          locationMap[loc.name] = { visits: 0, prospects: 0 };
        }
        locationMap[loc.name].visits += 1;
        locationMap[loc.name].prospects += loc.prospects_found || 0;
      });
    } else if (trip.location) {
      // Fallback to main location if no specific locations visited
      if (!locationMap[trip.location]) {
        locationMap[trip.location] = { visits: 0, prospects: 0 };
      }
      locationMap[trip.location].visits += 1;
      locationMap[trip.location].prospects += trip.prospects_added || 0;
    }
  });

  const locations = Object.entries(locationMap)
    .map(([name, stats]) => ({
      name,
      visits: stats.visits,
      total: stats.prospects,
      rate:
        stats.visits > 0
          ? (stats.prospects / stats.visits).toFixed(1) + "/visit"
          : "0/visit",
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // ROI by Trip Type (Calculated)
  const roiMap: Record<
    string,
    { trips: number; prospects: number; totalCost: number }
  > = {};
  trips.forEach((trip) => {
    const type = trip.trip_type || "Other";
    if (!roiMap[type]) {
      roiMap[type] = { trips: 0, prospects: 0, totalCost: 0 };
    }
    roiMap[type].trips += 1;
    roiMap[type].prospects += trip.prospects_added || 0;
    roiMap[type].totalCost += trip.total_cost || 0;
  });

  const roiStats = Object.entries(roiMap)
    .map(([type, stats]) => ({
      type,
      trips: stats.trips,
      prospects: stats.prospects,
      costPer:
        stats.prospects > 0
          ? `$${Math.round(stats.totalCost / stats.prospects)}/prospect`
          : "N/A",
    }))
    .sort((a, b) => b.prospects - a.prospects);

  return (
    <Card className="p-6 bg-indigo-50/30 border-indigo-100 shadow-sm rounded-[32px] space-y-6">
      <div className="flex items-center gap-2 text-indigo-700">
        <TrendingUp className="w-5 h-5" />
        <h3 className="text-lg font-black tracking-tight">
          Trip Analytics Overview
        </h3>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-indigo-50 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
            Total Trips
          </p>
          <p className="text-3xl font-black text-indigo-600">{totalTrips}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-indigo-50 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
            Prospects Discovered
          </p>
          <p className="text-3xl font-black text-emerald-600">
            {totalProspects}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-indigo-50 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
            Avg Conversion Rate
          </p>
          <p className="text-3xl font-black text-purple-600">
            {avgConversion}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-indigo-50 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
            Total Investment
          </p>
          <p className="text-3xl font-black text-gray-900">
            ${totalInvestment.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Bottom Details Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scout Performance */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-sm space-y-4">
          <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
            Scout Performance
          </h4>
          <div className="space-y-3">
            {scoutStats.map((scout) => (
              <div
                key={scout.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${scout.rank === 1 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {scout.rank}
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-900">
                      {scout.name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold">
                      {scout.trips} trips
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-600">
                    {scout.prospects}
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold">
                    {scout.conversion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Productive Locations */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-sm space-y-4">
          <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
            Most Productive Locations
          </h4>
          <div className="space-y-3">
            {locations.map((loc) => (
              <div key={loc.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="text-xs font-black text-gray-900 truncate max-w-[120px]">
                      {loc.name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold">
                      {loc.visits} visits
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-orange-600">
                    {loc.total}
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold">
                    {loc.rate}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROI by Trip Type */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-sm space-y-4">
          <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
            ROI by Trip Type
          </h4>
          <div className="space-y-3">
            {roiStats.map((roi) => (
              <div key={roi.type} className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-gray-900">{roi.type}</p>
                  <p className="text-[10px] text-gray-400 font-bold">
                    {roi.trips} trips
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-purple-600">
                    {roi.prospects}
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold">
                    {roi.costPer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
