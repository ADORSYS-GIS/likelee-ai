import React, { useState, useEffect } from "react";
import {
    Building2,
    Calendar as CalendarIcon,
    CheckCircle2,
    Clock,
    DollarSign,
    MapPin,
    Plus,
    Search,
    Upload,
    User,
    X,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { TALENT_DATA, CLIENT_DATA } from "@/data/mockData";

export const NewBookingModal = ({
    open,
    onOpenChange,
    onSave,
    initialData,
    mode = "new",
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (booking: any) => void;
    initialData?: any;
    mode?: "new" | "edit" | "duplicate";
}) => {
    const { toast } = useToast();
    const [bookingType, setBookingType] = useState("confirmed");
    const [multiTalent, setMultiTalent] = useState(false);
    const [talentSearch, setTalentSearch] = useState("");
    const [selectedTalents, setSelectedTalents] = useState<any[]>([]);
    const [clientSearch, setClientSearch] = useState("");
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [showAddClient, setShowAddClient] = useState(false);
    const [clients, setClients] = useState(CLIENT_DATA);
    const [newClient, setNewClient] = useState({
        company: "",
        contact: "",
        email: "",
        phone: "",
        terms: "Net 30",
    });
    const [date, setDate] = useState("2026-01-12");
    const [allDay, setAllDay] = useState(false);
    const [callTime, setCallTime] = useState("09:00");
    const [wrapTime, setWrapTime] = useState("17:00");
    const [rate, setRate] = useState(0);
    const [currency, setCurrency] = useState("USD");
    const [rateType, setRateType] = useState("day");
    const [usageTerms, setUsageTerms] = useState("");
    const [usageDuration, setUsageDuration] = useState("1");
    const [exclusive, setExclusive] = useState(false);
    const [notes, setNotes] = useState("");
    const [notifications, setNotifications] = useState({
        email: true,
        sms: false,
        push: false,
        calendar: true,
    });

    // Pre-fill data for Edit or Duplicate modes
    useEffect(() => {
        if (open && initialData) {
            setBookingType(initialData.type || "confirmed");
            setDate(initialData.date || "2026-01-12");
            setNotes(initialData.notes || "");

            // Try to find talent in TALENT_DATA
            const talent = TALENT_DATA.find((t) => t.name === initialData.talentName);
            if (talent) setSelectedTalents([talent]);

            // Try to find client in clients
            const client = clients.find((c) => c.company === initialData.clientName);
            if (client) setSelectedClient(client);

            setMultiTalent(false);
        } else if (open && !initialData) {
            setBookingType("confirmed");
            setMultiTalent(false);
            setSelectedTalents([]);
            setSelectedClient(null);
            setNotes("");
            setDate("2026-01-12");
        }
    }, [open, initialData, clients]);

    const filteredTalents = TALENT_DATA.filter((t) =>
        t.name.toLowerCase().includes(talentSearch.toLowerCase()),
    );

    const filteredClients = clients.filter((c) =>
        c.company.toLowerCase().includes(clientSearch.toLowerCase()),
    );

    const handleSelectTalent = (talent: any) => {
        if (multiTalent) {
            if (!selectedTalents.find((t) => t.id === talent.id)) {
                setSelectedTalents([...selectedTalents, talent]);
            } else {
                setSelectedTalents(selectedTalents.filter((t) => t.id !== talent.id));
            }
        } else {
            setSelectedTalents([talent]);
        }
        setTalentSearch("");
    };

    const handleAddClient = () => {
        const client = { id: `client-${Date.now()}`, ...newClient };
        setClients([...clients, client]);
        setSelectedClient(client);
        setShowAddClient(false);
        setClientSearch("");
    };

    const commission = rate * 0.2;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        {mode === "edit" ? "Edit Booking" : "New Booking"}
                    </DialogTitle>
                    <p className="text-sm text-gray-500">
                        {mode === "edit"
                            ? "Update details for this booking"
                            : "Schedule a booking for your talent"}
                    </p>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>Booking Type *</Label>
                        <div className="flex gap-2">
                            <Select value={bookingType} onValueChange={setBookingType}>
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="casting">Casting</SelectItem>
                                    <SelectItem value="option">Option</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="test-shoot">Test shoot</SelectItem>
                                    <SelectItem value="fitting">Fitting</SelectItem>
                                    <SelectItem value="rehearsal">Rehearsal</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                className="text-green-600 border-green-200 bg-green-50"
                            >
                                Preview
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Talent *</Label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="multi"
                                    checked={multiTalent}
                                    onChange={(e) => {
                                        setMultiTalent(e.target.checked);
                                        if (!e.target.checked && selectedTalents.length > 1) {
                                            setSelectedTalents([selectedTalents[0]]);
                                        }
                                    }}
                                    className="rounded border-gray-300"
                                />
                                <label htmlFor="multi" className="text-sm text-gray-600">
                                    Book multiple talent
                                </label>
                            </div>
                        </div>
                        <div className="relative">
                            <Input
                                placeholder="Search talent by name..."
                                value={talentSearch}
                                onChange={(e) => setTalentSearch(e.target.value)}
                            />
                        </div>

                        <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-white">
                            {filteredTalents.map((t) => (
                                <div
                                    key={t.id}
                                    onClick={() => handleSelectTalent(t)}
                                    className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${selectedTalents.find((st) => st.id === t.id)
                                            ? "bg-indigo-50/50"
                                            : ""
                                        }`}
                                >
                                    <img
                                        src={t.img}
                                        className="w-10 h-10 rounded-full object-cover border border-gray-100"
                                        alt={t.name}
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-900">{t.name}</p>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            <p className="text-xs text-green-600 font-medium lowercase">
                                                available
                                            </p>
                                        </div>
                                    </div>
                                    {selectedTalents.find((st) => st.id === t.id) && (
                                        <div className="text-indigo-600">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {filteredTalents.length === 0 && (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    No talent found matching "{talentSearch}"
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 mt-2">
                            {selectedTalents.map((t) => (
                                <div
                                    key={t.id}
                                    className="flex items-center justify-between p-2 bg-indigo-50 border border-indigo-100 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={t.img}
                                            className="w-8 h-8 rounded-full"
                                            alt={t.name}
                                        />
                                        <p className="text-sm font-bold text-indigo-900">
                                            Selected: {t.name}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded leading-none uppercase">
                                            Available
                                        </span>
                                        <button
                                            onClick={() =>
                                                setSelectedTalents(
                                                    selectedTalents.filter((st) => st.id !== t.id),
                                                )
                                            }
                                            className="text-indigo-400 hover:text-indigo-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Client *</Label>
                        {showAddClient ? (
                            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <Building2 className="w-4 h-4" /> New Client
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Company Name *</Label>
                                        <Input
                                            placeholder="Acme Inc."
                                            value={newClient.company}
                                            onChange={(e) =>
                                                setNewClient({ ...newClient, company: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Contact Name *</Label>
                                        <Input
                                            placeholder="John Doe"
                                            value={newClient.contact}
                                            onChange={(e) =>
                                                setNewClient({ ...newClient, contact: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Email</Label>
                                        <Input
                                            placeholder="john@acme.com"
                                            value={newClient.email}
                                            onChange={(e) =>
                                                setNewClient({ ...newClient, email: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Phone</Label>
                                        <Input
                                            placeholder="+1 (555) 123-4567"
                                            value={newClient.phone}
                                            onChange={(e) =>
                                                setNewClient({ ...newClient, phone: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Payment Terms</Label>
                                    <Select
                                        value={newClient.terms}
                                        onValueChange={(v) =>
                                            setNewClient({ ...newClient, terms: v })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Net 30">Net 30</SelectItem>
                                            <SelectItem value="Net 15">Net 15</SelectItem>
                                            <SelectItem value="Net 30">Net 30</SelectItem>
                                            <SelectItem value="Net 60">Net 60</SelectItem>
                                            <SelectItem value="Da">Da</SelectItem>
                                            <SelectItem value="Upon Completion">
                                                Upon Completion
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        className="bg-green-600 hover:bg-green-700 text-white font-bold"
                                        onClick={handleAddClient}
                                        disabled={!newClient.company || !newClient.contact}
                                    >
                                        Save Client & Use
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowAddClient(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <Input
                                        placeholder="Search client by name..."
                                        value={clientSearch}
                                        onChange={(e) => setClientSearch(e.target.value)}
                                    />
                                </div>

                                <div className="border border-gray-200 rounded-lg max-h-[200px] overflow-y-auto">
                                    {filteredClients.map((c) => (
                                        <div
                                            key={c.id}
                                            onClick={() => {
                                                setSelectedClient(c);
                                                setClientSearch("");
                                            }}
                                            className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${selectedClient?.id === c.id ? "bg-indigo-50/50" : ""
                                                }`}
                                        >
                                            <Building2 className="w-8 h-8 text-gray-400" />
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-gray-900">
                                                    {c.company}
                                                </p>
                                                <p className="text-xs text-gray-500">{c.contact}</p>
                                            </div>
                                            {selectedClient?.id === c.id && (
                                                <div className="text-indigo-600">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {filteredClients.length === 0 && (
                                        <div className="p-8 text-center text-gray-500 text-sm">
                                            No clients found matching "{clientSearch}"
                                        </div>
                                    )}
                                    <div
                                        onClick={() => setShowAddClient(true)}
                                        className="flex items-center gap-2 p-3 text-indigo-600 hover:bg-indigo-50 cursor-pointer border-t border-gray-200 font-bold text-sm"
                                    >
                                        <Plus className="w-4 h-4" /> Add New Client
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Date *</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                            <div className="flex items-center gap-2 mt-1">
                                <Switch
                                    id="allday"
                                    checked={allDay}
                                    onCheckedChange={setAllDay}
                                />
                                <Label
                                    htmlFor="allday"
                                    className="text-xs text-gray-500 cursor-pointer"
                                >
                                    All-day booking
                                </Label>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className={allDay ? "text-gray-300" : ""}>Call Time</Label>
                            <Input
                                type="time"
                                value={callTime}
                                onChange={(e) => setCallTime(e.target.value)}
                                disabled={allDay}
                                className={
                                    allDay ? "opacity-30 cursor-not-allowed bg-gray-50" : ""
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className={allDay ? "text-gray-300" : ""}>Wrap Time</Label>
                            <Input
                                type="time"
                                value={wrapTime}
                                onChange={(e) => setWrapTime(e.target.value)}
                                disabled={allDay}
                                className={
                                    allDay ? "opacity-30 cursor-not-allowed bg-gray-50" : ""
                                }
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Location *</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input className="pl-9" placeholder="Enter address..." />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Location Notes</Label>
                        <Input placeholder="e.g., Studio B, 3rd floor" />
                    </div>

                    <div className="grid grid-cols-3 gap-4 pb-1">
                        <div className="space-y-2">
                            <Label>Rate/Fee</Label>
                            <div className="relative group">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    {currency === "USD"
                                        ? "$"
                                        : currency === "EUR"
                                            ? "€"
                                            : currency === "GBP"
                                                ? "£"
                                                : "$"}
                                </span>
                                <Input
                                    className="pl-7 pr-4"
                                    type="number"
                                    value={rate}
                                    onChange={(e) => setRate(Number(e.target.value))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="GBP">GBP</SelectItem>
                                    <SelectItem value="CAD">CAD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Rate Type</Label>
                            <Select value={rateType} onValueChange={setRateType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="day">Day Rate</SelectItem>
                                    <SelectItem value="hourly">Hourly</SelectItem>
                                    <SelectItem value="flat">Flat Fee</SelectItem>
                                    <SelectItem value="tbd">TBD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {rate > 0 && (
                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center -mt-2">
                            <span className="text-sm font-medium text-indigo-900">
                                Agency Commission (20%)
                            </span>
                            <span className="text-sm font-bold text-indigo-900">
                                {currency}{" "}
                                {commission.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Usage Terms</Label>
                            <Select value={usageTerms} onValueChange={setUsageTerms}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select usage terms" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="social">Social Media Only</SelectItem>
                                    <SelectItem value="print">Print</SelectItem>
                                    <SelectItem value="digital">Digital</SelectItem>
                                    <SelectItem value="broadcast">Broadcast</SelectItem>
                                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                                    <SelectItem value="unlimited">Unlimited</SelectItem>
                                    <SelectItem value="tbd">TBD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-4 items-center">
                            <div className="flex-1 space-y-2">
                                <Label>Usage Duration</Label>
                                <Select value={usageDuration} onValueChange={setUsageDuration}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1 month">1 month</SelectItem>
                                        <SelectItem value="6 months">6 months</SelectItem>
                                        <SelectItem value="1 year">1 year</SelectItem>
                                        <SelectItem value="perpetuity">In Perpetuity</SelectItem>
                                        <SelectItem value="tbd">TBD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2 mt-6">
                                <Switch checked={exclusive} onCheckedChange={setExclusive} />
                                <span className="text-sm font-medium text-gray-700">
                                    Exclusive rights
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Attached Files (Call sheets, contracts, references)</Label>
                        <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative group">
                            <Upload className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600 font-medium">
                                Browse...
                            </span>
                            <span className="text-sm text-gray-400">No files selected.</span>
                            <input
                                type="file"
                                multiple
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => {
                                    console.log(e.target.files);
                                }}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Special Instructions / Notes</Label>
                        <Textarea
                            placeholder="Internal notes, special instructions..."
                            className="h-24"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="space-y-3">
                        <Label>Notifications</Label>
                        <div className="space-y-2 border border-gray-100 p-4 rounded-xl bg-gray-50/50">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="notify-email"
                                    checked={notifications.email}
                                    onChange={(e) =>
                                        setNotifications({
                                            ...notifications,
                                            email: e.target.checked,
                                        })
                                    }
                                />
                                <label htmlFor="notify-email" className="text-sm">
                                    Email talent
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="notify-sms"
                                    checked={notifications.sms}
                                    onChange={(e) =>
                                        setNotifications({
                                            ...notifications,
                                            sms: e.target.checked,
                                        })
                                    }
                                />
                                <label htmlFor="notify-sms" className="text-sm">
                                    SMS talent
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="notify-push"
                                    checked={notifications.push}
                                    onChange={(e) =>
                                        setNotifications({
                                            ...notifications,
                                            push: e.target.checked,
                                        })
                                    }
                                />
                                <label htmlFor="notify-push" className="text-sm">
                                    Push notification (mobile app)
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="notify-calendar"
                                    checked={notifications.calendar}
                                    onChange={(e) =>
                                        setNotifications({
                                            ...notifications,
                                            calendar: e.target.checked,
                                        })
                                    }
                                />
                                <label htmlFor="notify-calendar" className="text-sm">
                                    Send calendar invite (.ics file)
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0 mt-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-2 rounded-xl transition-all ${selectedTalents.length === 0 || !selectedClient
                                    ? "opacity-50 cursor-not-allowed grayscale-[0.5]"
                                    : ""
                                }`}
                            onClick={() => {
                                if (selectedTalents.length === 0 || !selectedClient) return;

                                // For each selected talent, create a separate booking entry
                                selectedTalents.forEach((talent, index) => {
                                    const isOriginalEntry = mode === "edit" && index === 0;
                                    const booking = {
                                        id: isOriginalEntry
                                            ? initialData.id
                                            : `booking-${Date.now()}-${talent.id}-${index}`,
                                        talentName: talent.name,
                                        date: date,
                                        type: bookingType,
                                        clientName: selectedClient.company,
                                        notes: notes,
                                    };
                                    onSave(booking);
                                });

                                toast({
                                    title:
                                        mode === "edit" ? "Booking Updated" : "Booking Created",
                                    description: `Successfully ${mode === "edit" ? "updated" : "scheduled"
                                        } ${bookingType} for ${selectedTalents
                                            .map((t) => t.name)
                                            .join(", ")} on ${date}.`,
                                });

                                onOpenChange(false);
                            }}
                            disabled={selectedTalents.length === 0 || !selectedClient}
                        >
                            {mode === "edit"
                                ? "Update Booking"
                                : `Save as ${bookingType === "test-shoot"
                                    ? "Test Shoot"
                                    : bookingType.charAt(0).toUpperCase() +
                                    bookingType.slice(1)
                                }`}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
