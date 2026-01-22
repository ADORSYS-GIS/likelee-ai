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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";

interface PlanTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPlan: (trip: any) => void;
}

export const PlanTripModal = ({ isOpen, onClose, onPlan }: PlanTripModalProps) => {
    const [scouts, setScouts] = React.useState(["Sarah Johnson", "Michael Lee"]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] rounded-3xl p-8">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-gray-900">Plan Scouting Trip</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="trip-name" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Trip Name *</Label>
                        <Input id="trip-name" placeholder="e.g., LA Fashion Week Scouting" className="rounded-xl border-gray-200 h-11" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="destination" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Destination *</Label>
                        <Input id="destination" placeholder="e.g., Los Angeles, CA" className="rounded-xl border-gray-200 h-11" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="start-date" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Start Date *</Label>
                            <Input id="start-date" type="date" className="rounded-xl border-gray-200 h-11" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="end-date" className="text-xs font-bold text-gray-700 uppercase tracking-wider">End Date *</Label>
                            <Input id="end-date" type="date" className="rounded-xl border-gray-200 h-11" />
                        </div>
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
                        <Label htmlFor="objective" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Trip Objective</Label>
                        <Select defaultValue="open">
                            <SelectTrigger className="rounded-xl border-gray-200 h-11">
                                <SelectValue placeholder="Select objective" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="open">Open Scouting</SelectItem>
                                <SelectItem value="event">Event Specific</SelectItem>
                                <SelectItem value="targeted">Targeted Talent</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="goal" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Target Discovery Goal</Label>
                            <Input id="goal" type="number" defaultValue="10" className="rounded-xl border-gray-200 h-11" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="budget" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Budget Allocated ($)</Label>
                            <Input id="budget" type="number" defaultValue="0" className="rounded-xl border-gray-200 h-11" />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Assign Scouts</Label>
                        <div className="flex flex-wrap gap-2 items-center">
                            {scouts.map(scout => (
                                <div key={scout} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-[11px] font-bold border border-gray-100">
                                    {scout}
                                    <button onClick={() => setScouts(scouts.filter(s => s !== scout))} className="hover:text-red-500">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 text-[11px] font-bold flex items-center gap-1 h-8 px-2">
                                <Plus className="w-3.5 h-3.5" /> Add Scout
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-3">
                    <Button variant="outline" onClick={onClose} className="rounded-xl h-11 px-8 font-bold border-gray-200">Cancel</Button>
                    <Button onClick={() => onPlan({})} className="rounded-xl h-11 px-8 font-bold bg-indigo-600 hover:bg-indigo-700 text-white">Create Trip</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
