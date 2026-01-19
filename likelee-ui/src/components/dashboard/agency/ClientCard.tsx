import React from "react";
import { Client } from "../../../types/agency";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Building2,
    Tag,
    Globe,
    Users,
    Mail,
    Phone,
    Package,
} from "lucide-react";

const ClientCard = ({
    client,
    onViewProfile,
}: {
    client: Client;
    onViewProfile: () => void;
}) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "Active Client":
                return "bg-emerald-50 text-emerald-800 border-emerald-100";
            case "Prospect":
                return "bg-blue-50 text-blue-800 border-blue-100";
            case "Lead":
                return "bg-gray-50 text-gray-800 border-gray-100";
            default:
                return "bg-gray-50 text-gray-800 border-gray-100";
        }
    };

    return (
        <Card className="p-8 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
            <div className="flex flex-col lg:flex-row justify-between gap-6">
                <div className="flex gap-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center">
                        <Building2 className="w-10 h-10 text-gray-500" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-gray-900">{client.name}</h3>
                            <Badge
                                variant="outline"
                                className={`${getStatusColor(client.status)} font-bold text-[11px] px-2.5 py-1 rounded-lg border shadow-sm`}
                            >
                                {client.status}
                            </Badge>
                            <div className="flex gap-1.5">
                                {client.tags.map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant="outline"
                                        className="text-[11px] font-bold text-gray-900 border-gray-200 px-2.5 py-1 rounded-lg bg-white shadow-sm flex items-center gap-1.5"
                                    >
                                        <Tag className="w-3 h-3 text-gray-900" />
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-gray-600 font-medium">
                            <span className="flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                {client.industry}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Globe className="w-4 h-4 text-gray-400" />
                                {client.website}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-gray-400" />
                                {client.contacts} contacts
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm mt-2.5 font-medium">
                            <span className="text-gray-500">
                                Total Revenue:{" "}
                                <span className="font-bold text-gray-900">
                                    {client.totalRevenue}
                                </span>
                            </span>
                            <span className="text-gray-500">
                                Bookings:{" "}
                                <span className="font-bold text-gray-900">
                                    {client.bookings}
                                </span>
                            </span>
                            <span className="text-gray-500">
                                Last Booking:{" "}
                                <span className="font-bold text-gray-900">
                                    {client.lastBooking}
                                </span>
                            </span>
                            <span className="text-gray-500">
                                Next Follow-up:{" "}
                                <span className="font-bold text-gray-900">
                                    {client.nextFollowUp}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-10 px-4 rounded-xl border-gray-200 text-gray-700 font-bold hover:bg-gray-50"
                    >
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-10 px-4 rounded-xl border-gray-200 text-gray-700 font-bold hover:bg-gray-50"
                    >
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-10 px-4 rounded-xl border-gray-200 text-gray-700 font-bold hover:bg-gray-50"
                    >
                        <Package className="w-4 h-4 mr-2" />
                        Send Package
                    </Button>
                    <Button
                        onClick={onViewProfile}
                        className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                    >
                        View Profile
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default ClientCard;
