import React from "react";
import { Users, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const RosterView = ({
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    consentFilter,
    setConsentFilter,
    sortConfig,
    setSortConfig,
}: any) => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Talent Roster</h2>
                    <p className="text-gray-500">Manage your agency's talent pool.</p>
                </div>
                <Button>
                    <Users className="w-4 h-4 mr-2" />
                    Add Talent
                </Button>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search talent..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                </Button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Roster View</h3>
                <p className="text-gray-500">Talent list will be displayed here.</p>
            </div>
        </div>
    );
};

export default RosterView;
