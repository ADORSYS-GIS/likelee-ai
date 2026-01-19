import React from "react";
import PlaceholderView from "./PlaceholderView";

export const ScoutingHubView = ({ activeTab, setActiveTab }: any) => (
    <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900">Scouting Hub</h2>
        </div>
        <PlaceholderView title={`Scouting: ${activeTab}`} />
    </div>
);

export default ScoutingHubView;
