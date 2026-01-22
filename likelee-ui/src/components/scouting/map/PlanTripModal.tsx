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
import {
    Plus,
    X,
    FileText,
    Camera,
    UserPlus,
    Image as ImageIcon,
    Check,
    MapPin,
    Calendar,
    Clock,
    Tag,
    Briefcase,
    Activity,
    Target,
    DollarSign,
    Users,
    BarChart3,
    ArrowUpRight,
    Info
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
    const [startTime, setStartTime] = React.useState(initialData?.start_time || "09:00");
    const [endDate, setEndDate] = React.useState(initialData?.end_date || "");
    const [endTime, setEndTime] = React.useState(initialData?.end_time || "18:00");
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
            setStartTime(initialData.start_time || "09:00");
            setEndDate(initialData.end_date || "");
            setEndTime(initialData.end_time || "18:00");
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
            setName("");
            setDestination("");
            setStartDate("");
            setStartTime("09:00");
            setEndDate("");
            setEndTime("18:00");
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

    const getStatusColor = (s: string) => {
        switch (s) {
            case "completed": return "text-green-700 bg-green-50 border-green-200";
            case "ongoing": return "text-blue-700 bg-blue-50 border-blue-200";
            case "planned": return "text-amber-700 bg-amber-50 border-amber-200";
            default: return "text-gray-700 bg-gray-50 border-gray-200";
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] rounded-[32px] p-0 overflow-hidden flex flex-col border-none shadow-2xl">
                <DialogHeader className="p-8 pb-6 flex-shrink-0 bg-white border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 shadow-sm">
                            <Briefcase className="w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black text-gray-900">
                                {initialData ? "Update Scouting Trip" : "Plan Scouting Trip"}
                            </DialogTitle>
                            <p className="text-sm text-gray-600 font-bold">Configure your field mission details</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-10 bg-white">
                    {/* Section 1: Trip Essentials */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-indigo-700 mb-2">
                            <Info className="w-4 h-4" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em]">Trip Essentials</h3>
                        </div>

                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="trip-name" className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <Tag className="w-3 h-3" /> Trip Name *
                                </Label>
                                <Input
                                    id="trip-name"
                                    placeholder="e.g., LA Fashion Week Scouting"
                                    className="rounded-xl border-gray-200 bg-gray-50/50 h-10 focus:bg-white focus:border-indigo-300 transition-all font-bold text-gray-900"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="destination" className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <MapPin className="w-3 h-3" /> Destination *
                                </Label>
                                <Input
                                    id="destination"
                                    placeholder="e.g., Los Angeles, CA"
                                    className="rounded-xl border-gray-200 bg-gray-50/50 h-10 focus:bg-white focus:border-indigo-300 transition-all font-bold text-gray-900"
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="trip-type" className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Briefcase className="w-3 h-3" /> Trip Type *
                                    </Label>
                                    <Select value={tripType} onValueChange={setTripType}>
                                        <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50/50 h-10 focus:bg-white focus:border-indigo-300 transition-all font-bold text-gray-900">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-gray-200 shadow-xl">
                                            <SelectItem value="Open Scouting">Open Scouting</SelectItem>
                                            <SelectItem value="Specific Casting">Specific Casting</SelectItem>
                                            <SelectItem value="Event Coverage">Event Coverage</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="status" className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Activity className="w-3 h-3" /> Status *
                                    </Label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger className={`rounded-xl h-10 transition-all font-black border-2 ${getStatusColor(status)} shadow-sm`}>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-gray-200 shadow-xl">
                                            <SelectItem value="planned">Planned</SelectItem>
                                            <SelectItem value="ongoing">Ongoing</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Schedule */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-indigo-700 mb-2">
                            <Calendar className="w-4 h-4" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em]">Schedule</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="start-date" className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Calendar className="w-3 h-3" /> Start Date *
                                    </Label>
                                    <Input
                                        id="start-date"
                                        type="date"
                                        className="rounded-xl border-gray-200 bg-gray-50/50 h-10 focus:bg-white focus:border-indigo-300 transition-all font-bold text-gray-900"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="start-time" className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Clock className="w-3 h-3" /> Start Time
                                    </Label>
                                    <Input
                                        id="start-time"
                                        type="time"
                                        className="rounded-xl border-gray-200 bg-gray-50/50 h-10 focus:bg-white focus:border-indigo-300 transition-all font-bold text-gray-900"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="end-date" className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Calendar className="w-3 h-3" /> End Date *
                                    </Label>
                                    <Input
                                        id="end-date"
                                        type="date"
                                        className="rounded-xl border-gray-200 bg-gray-50/50 h-10 focus:bg-white focus:border-indigo-300 transition-all font-bold text-gray-900"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="end-time" className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Clock className="w-3 h-3" /> End Time
                                    </Label>
                                    <Input
                                        id="end-time"
                                        type="time"
                                        className="rounded-xl border-gray-200 bg-gray-50/50 h-10 focus:bg-white focus:border-indigo-300 transition-all font-bold text-gray-900"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Performance Metrics */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-indigo-700 mb-2">
                            <BarChart3 className="w-4 h-4" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em]">Performance Metrics</h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1 shadow-sm">
                                <Label htmlFor="goal" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                                    <Target className="w-3 h-3" /> Target Goal
                                </Label>
                                <Input
                                    id="goal"
                                    type="number"
                                    className="border-none bg-transparent p-0 h-auto text-lg font-black text-indigo-900 focus-visible:ring-0"
                                    value={goal}
                                    onChange={(e) => setGoal(e.target.value)}
                                />
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1 shadow-sm">
                                <Label htmlFor="budget" className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                                    <DollarSign className="w-3 h-3" /> Budget ($)
                                </Label>
                                <Input
                                    id="budget"
                                    type="number"
                                    className="border-none bg-transparent p-0 h-auto text-lg font-black text-emerald-900 focus-visible:ring-0"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value)}
                                />
                            </div>
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1 shadow-sm">
                                <Label htmlFor="approached" className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                                    <Users className="w-3 h-3" /> Approached
                                </Label>
                                <Input
                                    id="approached"
                                    type="number"
                                    className="border-none bg-transparent p-0 h-auto text-lg font-black text-amber-900 focus-visible:ring-0"
                                    value={approached}
                                    onChange={(e) => setApproached(e.target.value)}
                                />
                            </div>
                            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 space-y-1 shadow-sm">
                                <Label htmlFor="submitted" className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
                                    <ArrowUpRight className="w-3 h-3" /> Submitted
                                </Label>
                                <Input
                                    id="submitted"
                                    type="number"
                                    className="border-none bg-transparent p-0 h-auto text-lg font-black text-purple-900 focus-visible:ring-0"
                                    value={submitted}
                                    onChange={(e) => setSubmitted(e.target.value)}
                                />
                            </div>
                            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-1 shadow-sm">
                                <Label htmlFor="added" className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                                    <Plus className="w-3 h-3" /> Added
                                </Label>
                                <Input
                                    id="added"
                                    type="number"
                                    className="border-none bg-transparent p-0 h-auto text-lg font-black text-blue-900 focus-visible:ring-0"
                                    value={added}
                                    onChange={(e) => setAdded(e.target.value)}
                                />
                            </div>
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1 shadow-sm">
                                <Label htmlFor="conversion" className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                                    <Activity className="w-3 h-3" /> Rate (%)
                                </Label>
                                <Input
                                    id="conversion"
                                    type="number"
                                    className="border-none bg-transparent p-0 h-auto text-lg font-black text-rose-900 focus-visible:ring-0"
                                    value={conversion}
                                    onChange={(e) => setConversion(e.target.value)}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Section 4: Team & Assets */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-indigo-700 mb-2">
                            <Users className="w-4 h-4" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em]">Team & Assets</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="grid gap-3">
                                <Label className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <UserPlus className="w-3 h-3" /> Assigned Scouts
                                </Label>
                                <div className="flex flex-wrap gap-2 items-center p-4 bg-gray-50 rounded-[24px] border border-gray-200 min-h-[60px] shadow-inner">
                                    {scouts.map(scout => (
                                        <div key={scout} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-800 rounded-xl text-xs font-black shadow-sm border border-indigo-100 animate-in fade-in slide-in-from-left-2">
                                            {scout}
                                            <button onClick={() => setScouts(scouts.filter(s => s !== scout))} className="hover:text-red-500 transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}

                                    {isAddingScout ? (
                                        <div className="flex items-center gap-2 bg-white border-2 border-indigo-300 rounded-xl px-3 py-1.5 shadow-md animate-in fade-in zoom-in duration-200">
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
                                                placeholder="Enter name..."
                                                className="h-6 w-28 text-xs border-none focus-visible:ring-0 p-0 font-black text-gray-900"
                                            />
                                            <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
                                                <button onClick={() => {
                                                    if (newScoutName.trim()) {
                                                        setScouts([...scouts, newScoutName.trim()]);
                                                        setNewScoutName("");
                                                        setIsAddingScout(false);
                                                    }
                                                }} className="text-indigo-700 hover:text-indigo-800">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setIsAddingScout(false)} className="text-gray-500 hover:text-gray-600">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-indigo-700 hover:text-indigo-800 text-xs font-black flex items-center gap-2 h-10 px-4 bg-indigo-100/50 hover:bg-indigo-100 rounded-xl border border-dashed border-indigo-300 transition-all"
                                            onClick={() => setIsAddingScout(true)}
                                        >
                                            <Plus className="w-4 h-4" /> Add Scout
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-3">
                                <Label className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <Camera className="w-3 h-3" /> Trip Photos
                                </Label>
                                <div className="grid grid-cols-4 gap-4">
                                    {photos.map((photo, index) => (
                                        <div key={index} className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-gray-200 group shadow-md">
                                            <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    onClick={() => removePhoto(index)}
                                                    className="p-2 bg-white rounded-full text-red-600 hover:scale-110 transition-transform shadow-lg"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-all bg-gray-50 hover:bg-indigo-50 group shadow-sm"
                                    >
                                        <Camera className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Upload</span>
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
                        </div>
                    </section>

                    {/* Section 5: Notes */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-indigo-700 mb-2">
                            <FileText className="w-4 h-4" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em]">Notes & Observations</h3>
                        </div>
                        <Textarea
                            placeholder="Describe trip objectives, focus areas, or specific results..."
                            className="rounded-xl border-gray-200 bg-gray-50/50 min-h-[80px] p-4 focus:bg-white focus:border-indigo-300 transition-all font-bold text-gray-900 resize-none shadow-inner"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </section>
                </div>

                <DialogFooter className="p-8 bg-white border-t border-gray-100 gap-4 flex-shrink-0">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="rounded-xl h-10 px-8 font-black text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900 transition-all"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => onPlan({
                            name,
                            location: destination,
                            start_date: startDate,
                            start_time: startTime,
                            end_date: endDate,
                            end_time: endTime,
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
                        className="rounded-xl h-10 px-10 font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center gap-2"
                    >
                        {initialData ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {initialData ? "Update Trip" : "Create Trip"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
