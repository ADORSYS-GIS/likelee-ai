import React from "react";
import { HardDrive } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const StorageUsageCard = () => (
    <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-indigo-600" />
                <span className="text-base font-bold text-gray-900">Storage Usage</span>
            </div>
            <span className="text-sm font-bold text-gray-900">
                <span className="text-indigo-600">12.4 GB</span> of 50 GB used
            </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div
                className="h-full bg-indigo-600 rounded-full"
                style={{ width: "24.8%" }}
            />
        </div>
        <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500 font-medium">
                37.6 GB remaining • Professional Plan
            </p>
            <Button variant="link" className="text-indigo-600 font-bold p-0 h-auto">
                Upgrade Plan
            </Button>
        </div>
    </Card>
);

export default StorageUsageCard;
