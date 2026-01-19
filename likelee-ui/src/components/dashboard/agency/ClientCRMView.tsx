import React, { useState } from "react";
import { Client } from "../../../types/agency";
import { MOCK_CLIENTS } from "../../../data/agencyMockData";
import ClientCard from "./ClientCard";
import AddClientModal from "./AddClientModal";
import ClientProfileModal from "./ClientProfileModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import {
    TrendingUp,
    Users,
    DollarSign,
    Clock,
    Search,
    Plus,
} from "lucide-react";

const ClientCRMView = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [stageFilter, setStageFilter] = useState("all");
    const [sortBy, setSortBy] = useState("last-booking");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    const filteredClients = MOCK_CLIENTS.filter((client) => {
        const matchesSearch =
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.industry.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStage =
            stageFilter === "all" ||
            client.status.toLowerCase().includes(stageFilter.toLowerCase());
        return matchesSearch && matchesStage;
    });

    return (
        <div className="space-y-8">
            {/* Demo Mode Alert */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-center gap-3 shadow-sm">
                <p className="text-sm font-bold text-blue-800">
                    <span className="font-black">Demo Mode:</span> This is a preview of
                    the Agency Dashboard for talent and modeling agencies.
                </p>
            </div>

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Client Relationship Management
                    </h1>
                    <p className="text-gray-600 font-medium">
                        Manage client relationships, track communications, and monitor
                        pipeline
                    </p>
                </div>
                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-xl flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Add Client
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-green-50/50 border-green-100 rounded-2xl">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        <span className="text-base font-bold text-green-800">
                            Active Clients
                        </span>
                    </div>
                    <span className="text-3xl font-bold text-green-900">1</span>
                </Card>
                <Card className="p-6 bg-blue-50/50 border-blue-100 rounded-2xl">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-base font-bold text-blue-800">Prospects</span>
                    </div>
                    <span className="text-3xl font-bold text-blue-900">1</span>
                </Card>
                <Card className="p-6 bg-purple-50/50 border-purple-100 rounded-2xl">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <DollarSign className="w-5 h-5 text-purple-600" />
                        </div>
                        <span className="text-base font-bold text-purple-800">
                            Total Revenue
                        </span>
                    </div>
                    <span className="text-3xl font-bold text-purple-900">$495K</span>
                </Card>
                <Card className="p-6 bg-orange-50/50 border-orange-100 rounded-2xl">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <span className="text-base font-bold text-orange-800">
                            Follow-ups Due
                        </span>
                    </div>
                    <span className="text-3xl font-bold text-orange-900">0</span>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-6">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        placeholder="Search clients..."
                        className="pl-12 h-12 bg-white border-gray-100 rounded-xl text-base"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger className="w-full md:w-56 h-12 bg-white border-gray-100 rounded-xl text-base">
                        <SelectValue placeholder="All Stages" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Stages</SelectItem>
                        <SelectItem value="leads">Leads</SelectItem>
                        <SelectItem value="prospects">Prospects</SelectItem>
                        <SelectItem value="active">Active Clients</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-56 h-12 bg-white border-gray-100 rounded-xl text-base">
                        <SelectValue placeholder="Last Booking" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="last-booking">Last Booking</SelectItem>
                        <SelectItem value="revenue">Total Revenue</SelectItem>
                        <SelectItem value="name">Company Name</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Client List */}
            <div className="space-y-4">
                {filteredClients.map((client) => (
                    <ClientCard
                        key={client.id}
                        client={client}
                        onViewProfile={() => setSelectedClient(client)}
                    />
                ))}
            </div>

            <AddClientModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
            {selectedClient && (
                <ClientProfileModal
                    client={selectedClient}
                    isOpen={!!selectedClient}
                    onClose={() => setSelectedClient(null)}
                />
            )}
        </div>
    );
};

export default ClientCRMView;
