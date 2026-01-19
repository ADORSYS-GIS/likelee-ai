import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Star } from "lucide-react";

const AddProspectModal = ({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        Add New Prospect
                    </DialogTitle>
                    <p className="text-sm text-gray-500">
                        Track talent before signing them to your roster
                    </p>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div>
                        <h3 className="font-bold text-gray-900 mb-4">Basic Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input id="name" placeholder="Full name" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" placeholder="email@example.com" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" placeholder="+1 (555) 123-4567" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="instagram">Instagram Handle</Label>
                                <Input id="instagram" placeholder="@username" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-gray-900 mb-4">Categories</h3>
                        <div className="flex flex-wrap gap-2">
                            {[
                                "Model",
                                "Actor",
                                "Influencer",
                                "Creator",
                                "Voice",
                                "Athlete",
                            ].map((cat) => (
                                <Button
                                    key={cat}
                                    variant="secondary"
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium"
                                >
                                    {cat}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-gray-900 mb-4">Discovery Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Discovery Source</Label>
                                <Select defaultValue="instagram">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="instagram">Instagram</SelectItem>
                                        <SelectItem value="tiktok">TikTok</SelectItem>
                                        <SelectItem value="street">Street Scouting</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Discovery Date</Label>
                                <div className="relative">
                                    <Input type="date" defaultValue="2026-01-12" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Discovery Location</Label>
                                <Input placeholder="New York, NY" />
                            </div>
                            <div className="space-y-2">
                                <Label>Referred By</Label>
                                <Input placeholder="Name of referrer" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-gray-900 mb-4">
                            Status & Assignment
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select defaultValue="new">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new">New Lead</SelectItem>
                                        <SelectItem value="contacted">Contacted</SelectItem>
                                        <SelectItem value="meeting">Meeting Scheduled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Assigned Agent</Label>
                                <Input placeholder="Agent name" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-gray-900 mb-2">Star Rating</h3>
                        <div className="flex gap-1">
                            {[1, 2, 3].map((i) => (
                                <Star
                                    key={i}
                                    className="w-8 h-8 fill-yellow-400 text-yellow-400"
                                />
                            ))}
                            {[4, 5].map((i) => (
                                <Star key={i} className="w-8 h-8 text-gray-300" />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Internal Notes</Label>
                        <Textarea
                            placeholder="Add notes about this prospect..."
                            className="h-32"
                        />
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-bold text-gray-900 mb-4">
                            Social Media (Optional)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Instagram Followers</Label>
                                <Input type="number" defaultValue="10000" />
                            </div>
                            <div className="space-y-2">
                                <Label>Engagement Rate (%)</Label>
                                <Input type="number" defaultValue="4.5" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            Add Prospect
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddProspectModal;
