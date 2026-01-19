import React from "react";
import { Settings } from "lucide-react";

export const PlaceholderView = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="bg-gray-100 p-6 rounded-full mb-4">
            <Settings className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500 max-w-sm">
            This section is currently under development. Check back soon for updates.
        </p>
    </div>
);

export default PlaceholderView;
