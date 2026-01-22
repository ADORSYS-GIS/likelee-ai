import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Star } from "lucide-react";

interface AddLocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (location: any) => void;
}

export const AddLocationModal = ({ isOpen, onClose, onAdd }: AddLocationModalProps) => {
    const [rating, setRating] = React.useState(3);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] rounded-3xl p-8">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-gray-900">Add Scouting Location</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="venue-name" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Venue Name *</Label>
                        <Input id="venue-name" placeholder="e.g., SoHo Shopping District" className="rounded-xl border-gray-200 h-11" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="location-type" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Location Type *</Label>
                            <Select defaultValue="shopping">
                                <SelectTrigger className="rounded-xl border-gray-200 h-11">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="shopping">Shopping District</SelectItem>
                                    <SelectItem value="park">Public Park</SelectItem>
                                    <SelectItem value="cafe">Cafe / Restaurant</SelectItem>
                                    <SelectItem value="event">Event Venue</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="scout-rating" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Scout Rating *</Label>
                            <Select defaultValue="3">
                                <SelectTrigger className="rounded-xl border-gray-200 h-11">
                                    <SelectValue placeholder="Select rating" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">⭐⭐⭐⭐⭐ Excellent</SelectItem>
                                    <SelectItem value="4">⭐⭐⭐⭐ Very Good</SelectItem>
                                    <SelectItem value="3">⭐⭐⭐ Good</SelectItem>
                                    <SelectItem value="2">⭐⭐ Fair</SelectItem>
                                    <SelectItem value="1">⭐ Poor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="address" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Address</Label>
                        <Input id="address" placeholder="Street address" className="rounded-xl border-gray-200 h-11" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="lat" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Latitude *</Label>
                            <Input id="lat" defaultValue="40.7128" className="rounded-xl border-gray-200 h-11" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="lng" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Longitude *</Label>
                            <Input id="lng" defaultValue="-74.0060" className="rounded-xl border-gray-200 h-11" />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="frequency" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Scout Frequency</Label>
                        <Select defaultValue="monthly">
                            <SelectTrigger className="rounded-xl border-gray-200 h-11">
                                <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Best Days to Scout</Label>
                        <div className="flex flex-wrap gap-2">
                            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                                <Button key={day} variant="outline" size="sm" className="rounded-lg text-[10px] font-bold h-7 px-3 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200">
                                    {day}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Best Times to Scout</Label>
                        <div className="flex flex-wrap gap-2">
                            {["Morning", "Afternoon", "Evening", "Night"].map(time => (
                                <Button key={time} variant="outline" size="sm" className="rounded-lg text-[10px] font-bold h-7 px-3 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200">
                                    {time}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="notes" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Notes</Label>
                        <Textarea id="notes" placeholder="e.g., Great for streetwear models, Young demographic 18-24" className="rounded-xl border-gray-200 min-h-[100px]" />
                    </div>
                </div>

                <DialogFooter className="gap-3">
                    <Button variant="outline" onClick={onClose} className="rounded-xl h-11 px-8 font-bold border-gray-200">Cancel</Button>
                    <Button onClick={() => onAdd({})} className="rounded-xl h-11 px-8 font-bold bg-indigo-600 hover:bg-indigo-700 text-white">Add Location</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
