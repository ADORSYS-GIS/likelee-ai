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
import { Plus, X, FileText, Camera, UserPlus, Image as ImageIcon, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PlanTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPlan: (trip: any) => void;
    initialData?: any;
}

export const PlanTripModal = ({ isOpen, onClose, onPlan, initialData }: PlanTripModalProps) => {
    const [scouts, setScouts] = React.useState<string[]>(initialData?.scout_ids || ["Sarah Johnson", "Michael Lee"]);
    const [photos, setPhotos] = React.useState<string[]>(initialData?.photos || []);
    const [newScoutName, setNewScoutName] = React.useState("");
    const [isAddingScout, setIsAddingScout] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Form states
    const [name, setName] = React.useState(initialData?.name || "");
    const [destination, setDestination] = React.useState(initialData?.location || "");
    const [startDate, setStartDate] = React.useState(initialData?.start_date || "");
    const [endDate, setEndDate] = React.useState(initialData?.end_date || "");
    const [lat, setLat] = React.useState(initialData?.lat?.toString() || "40.7128");
    const [lng, setLng] = React.useState(initialData?.lng?.toString() || "-74.0060");
    const [tripType, setTripType] = React.useState(initialData?.trip_type || "Open Scouting");
    const [status, setStatus] = React.useState(initialData?.status || "planned");
    const [goal, setGoal] = React.useState(initialData?.prospects_added?.toString() || "10");
    const [budget, setBudget] = React.useState(initialData?.total_cost?.toString() || "0");
    const [approached, setApproached] = React.useState(initialData?.prospects_approached?.toString() || "0");
    const [submitted, setSubmitted] = React.useState(initialData?.prospects_submitted?.toString() || "0");
    const [added, setAdded] = React.useState(initialData?.prospects_added?.toString() || "0");
    const [conversion, setConversion] = React.useState(initialData?.conversion_rate?.toString() || "0");
    const [notes, setNotes] = React.useState(initialData?.description || "");

    React.useEffect(() => {
        if (initialData) {
            setName(initialData.name || "");
            setDestination(initialData.location || "");
            setStartDate(initialData.start_date || "");
            setEndDate(initialData.end_date || "");
            setLat(initialData.lat?.toString() || "40.7128");
            setLng(initialData.lng?.toString() || "-74.0060");
            setTripType(initialData.trip_type || "Open Scouting");
            setStatus(initialData.status || "planned");
            setGoal(initialData.prospects_added?.toString() || "10");
            setBudget(initialData.total_cost?.toString() || "0");
            setApproached(initialData.prospects_approached?.toString() || "0");
            setSubmitted(initialData.prospects_submitted?.toString() || "0");
            setAdded(initialData.prospects_added?.toString() || "0");
            setConversion(initialData.conversion_rate?.toString() || "0");
            setNotes(initialData.description || "");
            setScouts(initialData.scout_ids || []);
            setPhotos(initialData.photos || []);
        } else {
            // Reset to defaults for new trip
            setName("");
            setDestination("");
            setStartDate("");
            setEndDate("");
            setLat("40.7128");
            setLng("-74.0060");
            setTripType("Open Scouting");
            setStatus("planned");
            setGoal("10");
            setBudget("0");
            setApproached("0");
            setSubmitted("0");
            setAdded("0");
            setConversion("0");
            setNotes("");
            setScouts(["Sarah Johnson", "Michael Lee"]);
            setPhotos([]);
        }
    }, [initialData, isOpen]);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newPhotos = Array.from(files).map(file => URL.createObjectURL(file));
            setPhotos([...photos, ...newPhotos]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(photos.filter((_, i) => i !== index));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] rounded-3xl p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-8 pb-4 flex-shrink-0">
                    <DialogTitle className="text-2xl font-black text-gray-900">
                        {initialData ? "Update Scouting Trip" : "Plan Scouting Trip"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-8 pb-8">
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="trip-name" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Trip Name *</Label>
                            <Input
                                id="trip-name"
                                placeholder="e.g., LA Fashion Week Scouting"
                                className="rounded-xl border-gray-200 h-11"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="destination" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Destination *</Label>
                            <Input
                                id="destination"
                                placeholder="e.g., Los Angeles, CA"
                                className="rounded-xl border-gray-200 h-11"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="start-date" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Start Date *</Label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    className="rounded-xl border-gray-200 h-11"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="end-date" className="text-xs font-bold text-gray-700 uppercase tracking-wider">End Date *</Label>
                                <Input
                                    id="end-date"
                                    type="date"
                                    className="rounded-xl border-gray-200 h-11"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="lat" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Latitude *</Label>
                                <Input
                                    id="lat"
                                    className="rounded-xl border-gray-200 h-11"
                                    value={lat}
                                    onChange={(e) => setLat(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="lng" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Longitude *</Label>
                                <Input
                                    id="lng"
                                    className="rounded-xl border-gray-200 h-11"
                                    value={lng}
                                    onChange={(e) => setLng(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="trip-type" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Trip Type *</Label>
                                <Select value={tripType} onValueChange={setTripType}>
                                    <SelectTrigger className="rounded-xl border-gray-200 h-11">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Open Scouting">Open Scouting</SelectItem>
                                        <SelectItem value="Specific Casting">Specific Casting</SelectItem>
                                        <SelectItem value="Event Coverage">Event Coverage</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="status" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Status *</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="rounded-xl border-gray-200 h-11">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="planned">Planned</SelectItem>
                                        <SelectItem value="ongoing">Ongoing</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="goal" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Target Discovery Goal</Label>
                                <Input
                                    id="goal"
                                    type="number"
                                    className="rounded-xl border-gray-200 h-11"
                                    value={goal}
                                    onChange={(e) => setGoal(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="budget" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Budget Allocated ($)</Label>
                                <Input
                                    id="budget"
                                    type="number"
                                    className="rounded-xl border-gray-200 h-11"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="approached" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Prospects Approached</Label>
                                <Input
                                    id="approached"
                                    type="number"
                                    className="rounded-xl border-gray-200 h-11"
                                    value={approached}
                                    onChange={(e) => setApproached(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="submitted" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Prospects Submitted</Label>
                                <Input
                                    id="submitted"
                                    type="number"
                                    className="rounded-xl border-gray-200 h-11"
                                    value={submitted}
                                    onChange={(e) => setSubmitted(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="added" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Added to Pipeline</Label>
                                <Input
                                    id="added"
                                    type="number"
                                    className="rounded-xl border-gray-200 h-11"
                                    value={added}
                                    onChange={(e) => setAdded(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="conversion" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Conversion Rate (%)</Label>
                                <Input
                                    id="conversion"
                                    type="number"
                                    className="rounded-xl border-gray-200 h-11"
                                    value={conversion}
                                    onChange={(e) => setConversion(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Notes & Observations</Label>
                            <Textarea
                                id="notes"
                                placeholder="Describe the trip objectives, specific areas to focus on, or any other relevant details..."
                                className="rounded-xl border-gray-200 min-h-[100px] resize-none"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Trip Photos</Label>
                            <div className="grid grid-cols-4 gap-3">
                                {photos.map((photo, index) => (
                                    <div key={index} className="relative aspect-video rounded-xl overflow-hidden border border-gray-100 group">
                                        <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removePhoto(index)}
                                            className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-video rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-400 transition-all bg-gray-50/50"
                                >
                                    <Camera className="w-5 h-5 mb-1" />
                                    <span className="text-[10px] font-bold uppercase">Add Photo</span>
                                </button>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handlePhotoUpload}
                                multiple
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Assign Scouts</Label>
                            <div className="flex flex-wrap gap-2 items-center">
                                {scouts.map(scout => (
                                    <div key={scout} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[11px] font-bold border border-indigo-100">
                                        <UserPlus className="w-3 h-3" />
                                        {scout}
                                        <button onClick={() => setScouts(scouts.filter(s => s !== scout))} className="hover:text-red-500 ml-1">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}

                                {isAddingScout ? (
                                    <div className="flex items-center gap-2 bg-white border border-indigo-200 rounded-lg px-2 py-1 shadow-sm animate-in fade-in zoom-in duration-200">
                                        <Input
                                            autoFocus
                                            value={newScoutName}
                                            onChange={(e) => setNewScoutName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    if (newScoutName.trim()) {
                                                        setScouts([...scouts, newScoutName.trim()]);
                                                        setNewScoutName("");
                                                        setIsAddingScout(false);
                                                    }
                                                } else if (e.key === 'Escape') {
                                                    setIsAddingScout(false);
                                                }
                                            }}
                                            placeholder="Scout name..."
                                            className="h-7 w-32 text-[11px] border-none focus-visible:ring-0 p-0"
                                        />
                                        <button
                                            onClick={() => {
                                                if (newScoutName.trim()) {
                                                    setScouts([...scouts, newScoutName.trim()]);
                                                    setNewScoutName("");
                                                    setIsAddingScout(false);
                                                }
                                            }}
                                            className="text-indigo-600 hover:text-indigo-700"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setIsAddingScout(false)}
                                            className="text-gray-400 hover:text-gray-500"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-indigo-600 hover:text-indigo-700 text-[11px] font-bold flex items-center gap-1 h-8 px-2 bg-gray-50 rounded-lg"
                                        onClick={() => setIsAddingScout(true)}
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Scout
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 pt-4 border-t border-gray-100 gap-3 flex-shrink-0">
                    <Button variant="outline" onClick={onClose} className="rounded-xl h-11 px-8 font-bold border-gray-200">Cancel</Button>
                    <Button
                        onClick={() => onPlan({
                            name,
                            location: destination,
                            start_date: startDate,
                            end_date: endDate,
                            lat: parseFloat(lat),
                            lng: parseFloat(lng),
                            trip_type: tripType,
                            status,
                            prospects_added: parseInt(added),
                            total_cost: parseFloat(budget),
                            prospects_approached: parseInt(approached),
                            prospects_submitted: parseInt(submitted),
                            conversion_rate: parseFloat(conversion),
                            description: notes,
                            scout_ids: scouts,
                            photos
                        })}
                        className="rounded-xl h-11 px-8 font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {initialData ? "Update Trip" : "Create Trip"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
