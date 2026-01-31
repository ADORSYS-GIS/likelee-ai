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

  const getFollowUpColor = (dateString: string | undefined) => {
    if (!dateString) return "text-gray-400";
    const d = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil(
      (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays <= 1) return "text-red-600 font-bold flex items-center gap-1";
    if (diffDays <= 3) return "text-amber-600 font-bold";
    return "text-indigo-600 font-bold";
  };

  return (
    <Card className="p-6 bg-white border border-gray-100 rounded-2xl hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-6 flex-1">
          <div className="w-14 h-14 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
            <Building2 className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 transition-colors" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                {client.name}
              </h3>
              <Badge
                className={`${getStatusColor(client.status)} border-none font-bold text-[9px] px-2 py-0.5 uppercase tracking-wider rounded-md`}
              >
                {client.status}
              </Badge>
              <div className="flex gap-1.5">
                {client.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] font-bold text-gray-400 border-gray-100 flex items-center gap-1 bg-white hover:border-gray-300 transition-colors"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6 text-[11px] text-gray-500 font-bold">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                {client.industry}
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-gray-400" />
                <span
                  className={
                    client.website
                      ? "text-indigo-600 hover:text-indigo-700 cursor-pointer underline decoration-indigo-200"
                      : ""
                  }
                >
                  {client.website || "No website"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                {client.contacts} contacts
              </div>
            </div>
            <div className="flex items-center gap-8 text-sm mt-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-bold">Total Revenue:</span>
                <span className="text-gray-900 font-extrabold text-lg">
                  {client.metrics?.revenue || client.totalRevenue}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-bold">Bookings:</span>
                <span className="text-gray-900 font-extrabold text-lg">
                  {client.metrics?.bookings || client.bookings}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-bold">Last Booking:</span>
                <span className="text-gray-900 font-bold text-base">
                  {client.metrics?.lastBookingDate || client.lastBooking}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-bold">Next Follow-up:</span>
                <span
                  className={`${getFollowUpColor(client.next_follow_up_date)} text-base`}
                >
                  {client.nextFollowUp}
                </span>
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
