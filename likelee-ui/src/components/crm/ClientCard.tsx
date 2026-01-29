import React from "react";
import {
    Building2,
    Tag,
    Globe,
    Users,
    Mail,
    Phone,
    Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Client } from "@/types/crm";

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
        <Card className="p-6 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-6 flex-1">
                    <div className="w-14 h-14 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center shrink-0">
                        <Building2 className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900">{client.name}</h3>
                            <Badge className="bg-gray-100 text-gray-600 border-none font-bold text-[10px] px-2 py-0.5">
                                {client.status}
                            </Badge>
                            <div className="flex gap-1.5">
                                {client.tags.map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant="outline"
                                        className="text-[10px] font-bold text-gray-400 border-gray-200 flex items-center gap-1"
                                    >
                                        <Tag className="w-2.5 h-2.5" />
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-6 text-xs text-gray-500 font-bold">
                            <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                {client.industry}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-gray-400" />
                                {client.website || "No website"}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                {client.contacts} contacts
                            </div>
                        </div>
                        <div className="flex items-center gap-8 text-[11px] font-bold">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 uppercase">Total Revenue:</span>
                                <span className="text-gray-900">{client.metrics?.revenue || client.totalRevenue}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 uppercase">Bookings:</span>
                                <span className="text-gray-900">{client.metrics?.bookings || client.bookings}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 uppercase">Last Booking:</span>
                                <span className="text-gray-900">{client.metrics?.lastBookingDate || client.lastBooking}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 uppercase">Next Follow-up:</span>
                                <span className="text-gray-900">{client.nextFollowUp}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="h-9 px-4 rounded-lg border-gray-200 text-gray-600 font-bold text-xs"
                    >
                        <Mail className="w-3.5 h-3.5 mr-2" />
                        Email
                    </Button>
                    <Button
                        variant="outline"
                        className="h-9 px-4 rounded-lg border-gray-200 text-gray-600 font-bold text-xs"
                    >
                        <Phone className="w-3.5 h-3.5 mr-2" />
                        Call
                    </Button>
                    <Button
                        variant="outline"
                        className="h-9 px-4 rounded-lg border-gray-200 text-gray-600 font-bold text-xs"
                    >
                        <Package className="w-3.5 h-3.5 mr-2" />
                        Send Package
                    </Button>
                    <Button
                        onClick={onViewProfile}
                        className="h-9 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
                    >
                        View Profile
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default ClientCard;
