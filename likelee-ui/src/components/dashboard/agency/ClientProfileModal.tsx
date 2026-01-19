import React from "react";
import { Client } from "../../../types/agency";
import {
    MOCK_CONTACTS,
    MOCK_COMMUNICATIONS,
} from "../../../data/agencyMockData";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
    Building2,
    TrendingUp,
    Plus,
    Mail,
    Phone,
    Edit,
    Video,
    Calendar,
    File,
    Trash2,
} from "lucide-react";

const ClientProfileModal = ({
    client,
    isOpen,
    onClose,
}: {
    client: Client;
    isOpen: boolean;
    onClose: () => void;
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden rounded-2xl border-none">
                <div className="p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex items-center gap-3">
                            <DialogTitle className="text-2xl font-bold text-gray-900">
                                {client.name}
                            </DialogTitle>
                            <Badge className="bg-green-100 text-green-700 border-none font-bold text-[10px]">
                                {client.status}
                            </Badge>
                        </div>
                    </div>

                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="w-full justify-start bg-gray-50/50 p-1 rounded-xl h-12 mb-6">
                            <TabsTrigger
                                value="overview"
                                className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-sm"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="contacts"
                                className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-sm"
                            >
                                Contacts
                            </TabsTrigger>
                            <TabsTrigger
                                value="communications"
                                className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-sm"
                            >
                                Communications
                            </TabsTrigger>
                            <TabsTrigger
                                value="bookings"
                                className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-sm"
                            >
                                Bookings
                            </TabsTrigger>
                            <TabsTrigger
                                value="files"
                                className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-sm"
                            >
                                Files & Notes
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6 mt-0">
                            <div className="grid grid-cols-2 gap-6">
                                <Card className="p-6 border-gray-100 rounded-2xl shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Building2 className="w-5 h-5 text-gray-400" />
                                        <h4 className="font-bold text-gray-900">
                                            Company Information
                                        </h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                                                Industry
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {client.industry}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                                                Website
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {client.website}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 font-bold uppercase tracking-wider mb-2">
                                                Tags
                                            </p>
                                            <div className="flex gap-2">
                                                {client.tags.map((tag) => (
                                                    <Badge
                                                        key={tag}
                                                        variant="outline"
                                                        className="text-[10px] font-bold text-gray-500 border-gray-200"
                                                    >
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6 border-gray-100 rounded-2xl shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <TrendingUp className="w-5 h-5 text-gray-400" />
                                        <h4 className="font-bold text-gray-900">
                                            Client Preferences
                                        </h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                                                Preferred Talent Types
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {client.preferences?.talentTypes.join(", ") || "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                                                Budget Range
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {client.preferences?.budgetRange || "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                                                Booking Lead Time
                                            </p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {client.preferences?.leadTime || "—"}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-900">Client Metrics</h4>
                                <div className="grid grid-cols-4 gap-4">
                                    <Card className="p-4 bg-purple-50/50 border-purple-100 rounded-xl text-center">
                                        <span className="text-2xl font-bold text-purple-600 block">
                                            {client.metrics?.revenue || "—"}
                                        </span>
                                        <span className="text-[10px] font-bold text-purple-400 uppercase">
                                            Total Revenue
                                        </span>
                                    </Card>
                                    <Card className="p-4 bg-green-50/50 border-green-100 rounded-xl text-center">
                                        <span className="text-2xl font-bold text-green-600 block">
                                            {client.metrics?.bookings || 0}
                                        </span>
                                        <span className="text-[10px] font-bold text-green-400 uppercase">
                                            Total Bookings
                                        </span>
                                    </Card>
                                    <Card className="p-4 bg-blue-50/50 border-blue-100 rounded-xl text-center">
                                        <span className="text-2xl font-bold text-blue-600 block">
                                            {client.metrics?.packagesSent || 0}
                                        </span>
                                        <span className="text-[10px] font-bold text-blue-400 uppercase">
                                            Packages Sent
                                        </span>
                                    </Card>
                                    <Card className="p-4 bg-orange-50/50 border-orange-100 rounded-xl text-center">
                                        <span className="text-2xl font-bold text-orange-600 block">
                                            {client.metrics?.lastBookingDate || "—"}
                                        </span>
                                        <span className="text-[10px] font-bold text-orange-400 uppercase">
                                            Last Booking
                                        </span>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="contacts" className="space-y-6 mt-0">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-gray-900">Contact List</h4>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                                    <Plus className="w-4 h-4" />
                                    Add Contact
                                </Button>
                            </div>
                            <div className="space-y-4">
                                {MOCK_CONTACTS.map((contact, idx) => (
                                    <Card
                                        key={idx}
                                        className="p-6 border-gray-100 rounded-2xl shadow-sm"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-3">
                                                <div>
                                                    <h5 className="font-bold text-gray-900 text-lg">
                                                        {contact.name}
                                                    </h5>
                                                    <p className="text-sm text-gray-500 font-medium">
                                                        {contact.role}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                                        <Mail className="w-4 h-4 text-gray-500" />
                                                        {contact.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                                        <Phone className="w-4 h-4 text-gray-500" />
                                                        {contact.phone}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="w-10 h-10 rounded-xl border-gray-100"
                                                >
                                                    <Mail className="w-4 h-4 text-gray-500" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="w-10 h-10 rounded-xl border-gray-100"
                                                >
                                                    <Phone className="w-4 h-4 text-gray-500" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="w-10 h-10 rounded-xl border-gray-100"
                                                >
                                                    <Edit className="w-4 h-4 text-gray-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="communications" className="space-y-6 mt-0">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-gray-900">
                                    Communication History
                                </h4>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                                    <Plus className="w-4 h-4" />
                                    Log Communication
                                </Button>
                            </div>
                            <div className="space-y-4">
                                {MOCK_COMMUNICATIONS.map((comm, idx) => (
                                    <Card
                                        key={idx}
                                        className="p-6 border-gray-100 rounded-2xl shadow-sm"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
                                                    {comm.type === "email" && (
                                                        <Mail className="w-5 h-5 text-indigo-600" />
                                                    )}
                                                    {comm.type === "call" && (
                                                        <Phone className="w-5 h-5 text-indigo-600" />
                                                    )}
                                                    {comm.type === "meeting" && (
                                                        <Video className="w-5 h-5 text-indigo-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-gray-900">
                                                        {comm.subject}
                                                    </h5>
                                                    <p className="text-sm text-gray-600 font-medium">
                                                        {comm.date} • {comm.participants}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className="bg-gray-50 text-gray-600 border-gray-100 font-bold px-3 py-1"
                                            >
                                                {comm.type}
                                            </Badge>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="bookings" className="space-y-6 mt-0">
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <Calendar className="w-16 h-16 text-gray-200 mb-4" />
                                <h4 className="text-xl font-bold text-gray-900">
                                    No Bookings Yet
                                </h4>
                                <p className="text-gray-500">
                                    This client hasn't made any bookings through the platform yet.
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="files" className="space-y-6 mt-0">
                            <Card className="p-6 border-gray-100 rounded-2xl shadow-sm space-y-4">
                                <h4 className="font-bold text-gray-900">Notes</h4>
                                <Textarea
                                    defaultValue="Prefers diverse talent, always books for multi-day shoots."
                                    className="min-h-[120px] bg-white border-gray-200 rounded-xl resize-none font-medium"
                                />
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl">
                                    Save Notes
                                </Button>
                            </Card>

                            <Card className="p-6 border-gray-100 rounded-2xl shadow-sm space-y-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-gray-900">Files & Documents</h4>
                                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                                        <Plus className="w-4 h-4" />
                                        Upload File
                                    </Button>
                                </div>
                                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                                    <File className="w-12 h-12 text-gray-300 mb-3" />
                                    <p className="text-gray-500 font-bold">
                                        No files uploaded yet
                                    </p>
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="h-10 px-4 rounded-xl border-gray-200 text-gray-600 font-bold"
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Client
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 px-4 rounded-xl border-red-100 text-red-500 hover:bg-red-50 font-bold"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Client
                            </Button>
                        </div>
                        <Button
                            onClick={onClose}
                            className="h-10 px-8 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl"
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ClientProfileModal;
