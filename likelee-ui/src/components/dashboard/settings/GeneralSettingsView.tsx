import React, { useState } from "react";
import {
    Building2,
    Upload,
    Save,
    DollarSign,
    Plus,
    Edit2,
    Mail,
    Copy,
    Bell,
    User,
    FileText,
    Users,
    Globe,
    Calendar,
    MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FileStorageView from "./FileStorageView";

const InviteTeamMemberModal = ({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-gray-900">
                        Invite Team Member
                    </DialogTitle>
                    <p className="text-sm text-gray-500 font-medium">
                        Send an email invitation to join your agency team
                    </p>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-900">
                            Email Address
                        </Label>
                        <Input
                            placeholder="colleague@example.com"
                            className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-900">User Role</Label>
                        <Select defaultValue="booker">
                            <SelectTrigger className="h-11 bg-gray-50 border-gray-200 rounded-xl">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Admin - Full access</SelectItem>
                                <SelectItem value="booker">
                                    Booker - Create/edit bookings
                                </SelectItem>
                                <SelectItem value="scout">Scout - Add prospects</SelectItem>
                                <SelectItem value="accountant">
                                    Accountant - Finance only
                                </SelectItem>
                                <SelectItem value="coordinator">
                                    Talent Coordinator - Manage profiles
                                </SelectItem>
                                <SelectItem value="readonly">Read-Only - View only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                        <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                            <span className="font-bold">Note:</span> The invited user will
                            receive an email with instructions to set up their account and
                            access the dashboard with the assigned role.
                        </p>
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="font-bold"
                    >
                        Cancel
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Send Invitation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const EditPermissionsModal = ({
    open,
    onOpenChange,
    member,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    member: any;
}) => {
    if (!member) return null;

    const sections = [
        {
            title: "Bookings & Calendar",
            permissions: [
                { label: "Can view bookings", default: true },
                { label: "Can create bookings", default: false },
                { label: "Can edit bookings", default: false },
                { label: "Can delete bookings", default: false },
            ],
        },
        {
            title: "Finance & Invoicing",
            permissions: [
                { label: "Can view finances", default: false },
                { label: "Can create invoices", default: false },
            ],
        },
        {
            title: "Talent Roster",
            permissions: [
                { label: "Can view roster", default: true },
                { label: "Can edit talent profiles", default: false },
                { label: "Can add prospects", default: true },
            ],
        },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl font-bold text-gray-900">
                        Edit Permissions - {member.name}
                    </DialogTitle>
                    <p className="text-sm text-gray-500 font-medium">
                        Role: {member.role}
                    </p>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-8">
                    {sections.map((section) => (
                        <div key={section.title} className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                                {section.title}
                            </h4>
                            <div className="space-y-3">
                                {section.permissions.map((perm) => (
                                    <div
                                        key={perm.label}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                                    >
                                        <span className="text-sm font-medium text-gray-700">
                                            {perm.label}
                                        </span>
                                        <Switch defaultChecked={perm.default} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <DialogFooter className="p-6 border-t border-gray-100 gap-2 sm:gap-0">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="font-bold"
                    >
                        Cancel
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 rounded-xl">
                        Save Permissions
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ActivityLogModal = ({
    open,
    onOpenChange,
    member,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    member: any;
}) => {
    if (!member) return null;

    const activities = [
        {
            action: "Created booking",
            details: "Vogue Magazine - Emma Stone",
            time: "Jan 12, 2024 10:15 AM",
            icon: Calendar,
            color: "text-blue-600 bg-blue-50",
        },
        {
            action: "Updated talent profile",
            details: "Milan Anderson - Added new headshots",
            time: "Jan 12, 2024 9:45 AM",
            icon: User,
            color: "text-purple-600 bg-purple-50",
        },
        {
            action: "Generated invoice",
            details: "Invoice #2024-089 for Nike",
            time: "Jan 11, 2024 4:30 PM",
            icon: FileText,
            color: "text-green-600 bg-green-50",
        },
        {
            action: "Added prospect",
            details: "Alex Johnson from Instagram",
            time: "Jan 11, 2024 2:20 PM",
            icon: Users,
            color: "text-orange-600 bg-orange-50",
        },
        {
            action: "Logged in",
            details: "From Chrome on Windows",
            time: "Jan 12, 2024 8:00 AM",
            icon: Globe,
            color: "text-gray-600 bg-gray-50",
        },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg rounded-2xl max-h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl font-bold text-gray-900">
                        Activity Log - {member.name}
                    </DialogTitle>
                    <p className="text-sm text-gray-500 font-medium">
                        Recent actions and system events
                    </p>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4">
                    {activities.map((activity, idx) => (
                        <div
                            key={idx}
                            className="flex gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl"
                        >
                            <div
                                className={`w-10 h-10 rounded-xl ${activity.color} flex items-center justify-center shrink-0`}
                            >
                                <activity.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">
                                    {activity.action}
                                </p>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">
                                    {activity.details}
                                </p>
                                <p className="text-[10px] text-gray-400 font-medium mt-1">
                                    {activity.time}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                <DialogFooter className="p-6 border-t border-gray-100">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="w-full font-bold rounded-xl h-11"
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const GeneralSettingsView = () => {
    const [activeTab, setActiveTab] = useState("Profile");
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Agency Settings</h2>
                <p className="text-gray-600 font-medium">
                    Configure your agency profile and preferences
                </p>
            </div>

            <div className="flex gap-2 p-1 bg-gray-100/50 rounded-xl w-full overflow-x-auto no-scrollbar sm:w-fit">
                {[
                    "Profile",
                    "Commissions",
                    "Email Templates",
                    "Notifications",
                    "Tax & Currency",
                    "Divisions",
                    "Team",
                    "File Storage",
                    "Integrations",
                ].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === tab
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === "Profile" && (
                <div className="space-y-6">
                    {/* Agency Information */}
                    <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-2xl">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-indigo-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                                Agency Information
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-900">
                                    Agency Name *
                                </Label>
                                <Input
                                    defaultValue="CM Models"
                                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-900">
                                    Legal Entity Name
                                </Label>
                                <Input
                                    defaultValue="CM Models LLC"
                                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm font-bold text-gray-900">Address</Label>
                                <Input
                                    defaultValue="123 Fashion Ave"
                                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-900">City</Label>
                                <Input
                                    defaultValue="New York"
                                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-900">
                                        State/Province
                                    </Label>
                                    <Input
                                        defaultValue="NY"
                                        className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-900">
                                        ZIP/Postal Code
                                    </Label>
                                    <Input
                                        defaultValue="10001"
                                        className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-900">Country</Label>
                                <Select defaultValue="us">
                                    <SelectTrigger className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl">
                                        <SelectValue placeholder="Select country" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="us">United States</SelectItem>
                                        <SelectItem value="uk">United Kingdom</SelectItem>
                                        <SelectItem value="de">Germany</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-900">Time Zone</Label>
                                <Select defaultValue="est">
                                    <SelectTrigger className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl">
                                        <SelectValue placeholder="Select timezone" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="est">Eastern Time (EST)</SelectItem>
                                        <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                                        <SelectItem value="cet">Central European Time (CET)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-900">Phone</Label>
                                <Input
                                    defaultValue="+1 (212) 555-0123"
                                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-900">Email</Label>
                                <Input
                                    defaultValue="info@cmmodels.com"
                                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm font-bold text-gray-900">Website</Label>
                                <Input
                                    defaultValue="https://cmmodels.com/"
                                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm font-bold text-gray-900">
                                    Tax ID / VAT Number
                                </Label>
                                <Input
                                    defaultValue="12-3456789"
                                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Branding */}
                    <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-2xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">
                            Branding
                        </h3>
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <Label className="text-sm font-bold text-gray-900">
                                    Agency Logo
                                </Label>
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm overflow-hidden p-2">
                                        <img
                                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/a37a561a8_Screenshot2025-10-29at70538PM.png"
                                            alt="Logo"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="h-10 px-4 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Upload New Logo
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <Label className="text-sm font-bold text-gray-900">
                                        Primary Brand Color
                                    </Label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-600 border border-gray-200 shadow-sm" />
                                        <Input
                                            defaultValue="#4F46E5"
                                            className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl flex-1"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <Label className="text-sm font-bold text-gray-900">
                                        Secondary Brand Color
                                    </Label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-500 border border-gray-200 shadow-sm" />
                                        <Input
                                            defaultValue="#10B981"
                                            className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl flex-1"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-900">
                                    Email Signature
                                </Label>
                                <Textarea
                                    defaultValue={`Best regards,\nCM Models\nhttps://cmmodels.com/\n+1 (212) 555-0123`}
                                    className="bg-white border-gray-200 min-h-[120px] text-gray-900 font-medium rounded-xl resize-none"
                                />
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end">
                        <Button className="h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2">
                            <Save className="w-5 h-5" />
                            Save Profile Settings
                        </Button>
                    </div>
                </div>
            )}

            {activeTab === "Commissions" && (
                <div className="space-y-6">
                    {/* Default Commission Rate */}
                    <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                                Default Commission Rate
                            </h3>
                        </div>
                        <div className="space-y-4 max-w-md">
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-900">
                                    Agency Commission (%)
                                </Label>
                                <Input
                                    defaultValue="20"
                                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                                />
                                <p className="text-xs text-gray-500 font-medium">
                                    Applied to all bookings unless overridden
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Division Commissions */}
                    <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                                Division Commissions
                            </h3>
                            <Button
                                variant="outline"
                                className="h-8 px-3 sm:h-9 sm:px-4 rounded-lg border-gray-200 font-bold text-xs flex items-center gap-2"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Division
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {[
                                { name: "Women", count: 45, rate: 20 },
                                { name: "Men", count: 32, rate: 20 },
                                { name: "Kids", count: 18, rate: 15 },
                                { name: "Curve", count: 12, rate: 20 },
                            ].map((division) => (
                                <div
                                    key={division.name}
                                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 p-4 bg-gray-50/50 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">
                                            {division.name}
                                        </p>
                                        <p className="text-xs text-gray-500 font-medium">
                                            {division.count} talent
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                defaultValue={division.rate}
                                                className="w-16 h-9 bg-white border-gray-200 text-center font-bold text-sm rounded-lg"
                                            />
                                            <span className="text-sm font-bold text-gray-500">%</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-8 h-8 text-gray-400 hover:text-indigo-600"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Per-Talent Custom Commissions */}
                    <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-2xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">
                            Per-Talent Custom Commissions
                        </h3>
                        <p className="text-sm text-gray-500 font-medium mb-8">
                            Override commission rates for specific talent (edit from talent
                            profile)
                        </p>
                        <div className="flex flex-col items-center justify-center py-12 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                <Users className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-sm font-bold text-gray-500">
                                No custom commission rates set
                            </p>
                        </div>
                    </Card>

                    <div className="flex justify-end">
                        <Button className="h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2">
                            <Save className="w-5 h-5" />
                            Save Commission Settings
                        </Button>
                    </div>
                </div>
            )}

            {activeTab === "Email Templates" && (
                <div className="space-y-6">
                    <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <Mail className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                                        Email Templates
                                    </h3>
                                    <p className="text-sm text-gray-500 font-medium">
                                        Customize automated email messages
                                    </p>
                                </div>
                            </div>
                            <Button className="h-9 px-3 sm:h-10 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                New Template
                            </Button>
                        </div>

                        <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl mb-8">
                            <h4 className="text-sm font-bold text-blue-900 mb-4">
                                Available Variables:
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-8">
                                {[
                                    "{talent_name}",
                                    "{client_name}",
                                    "{booking_date}",
                                    "{call_time}",
                                    "{location}",
                                    "{rate}",
                                    "{invoice_number}",
                                    "{invoice_total}",
                                    "{payment_terms}",
                                    "{due_date}",
                                    "{agency_name}",
                                ].map((variable) => (
                                    <code
                                        key={variable}
                                        className="text-xs font-bold text-blue-600 bg-white px-2 py-1 rounded border border-blue-100 w-fit"
                                    >
                                        {variable}
                                    </code>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            {[
                                {
                                    title: "Booking Confirmation",
                                    subject: "Booking Confirmed - {client_name}",
                                    body: "Hi {talent_name},\n\nYour booking with {client_name} on {booking_date} at {call_time} has been confirmed.\n\nLocation: {location}\nRate: {rate}\n\nBest regards,\n{agency_name}",
                                },
                                {
                                    title: "Invoice Email",
                                    subject: "Invoice {invoice_number} from {agency_name}",
                                    body: "Dear {client_name},\n\nPlease find attached invoice {invoice_number} for the amount of {invoice_total}.\n\nPayment terms: {payment_terms}\n\nThank you for your business.\n\n{agency_name}",
                                },
                                {
                                    title: "Payment Reminder",
                                    subject: "Payment Reminder - Invoice {invoice_number}",
                                    body: "Dear {client_name},\n\nThis is a friendly reminder that invoice {invoice_number} for {invoice_total} is due on {due_date}.\n\nIf you have already made the payment, please disregard this message.\n\nThank you,\n{agency_name}",
                                },
                            ].map((template) => (
                                <div
                                    key={template.title}
                                    className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl space-y-4"
                                >
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-base font-bold text-gray-900">
                                                {template.title}
                                            </h4>
                                            <Badge className="bg-green-50 text-green-600 border-green-100 font-bold text-[10px] h-5">
                                                Active
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="w-8 h-8 rounded-lg border-gray-200"
                                            >
                                                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="w-8 h-8 rounded-lg border-gray-200"
                                            >
                                                <Copy className="w-3.5 h-3.5 text-gray-500" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Subject:
                                        </Label>
                                        <p className="text-sm font-bold text-gray-900">
                                            {template.subject}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Body:
                                        </Label>
                                        <div className="p-4 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-700 font-medium whitespace-pre-line leading-relaxed">
                                            {template.body}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <div className="flex justify-end">
                        <Button className="h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2">
                            <Save className="w-5 h-5" />
                            Save Email Templates
                        </Button>
                    </div>
                </div>
            )}

            {activeTab === "Notifications" && (
                <div className="space-y-6">
                    <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-2xl">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                                <Bell className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                                    Notification Preferences
                                </h3>
                                <p className="text-sm text-gray-500 font-medium">
                                    Choose how you want to be notified about important events
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {[
                                {
                                    title: "Booking Created",
                                    desc: "When a new booking is created",
                                },
                                {
                                    title: "Booking Confirmed",
                                    desc: "When a booking status changes to confirmed",
                                },
                                {
                                    title: "Payment Received",
                                    desc: "When payment is received from a client",
                                },
                                {
                                    title: "Invoice Sent",
                                    desc: "When an invoice is sent to a client",
                                },
                                {
                                    title: "Talent Book Out",
                                    desc: "When talent marks themselves unavailable",
                                },
                                {
                                    title: "License Expiring",
                                    desc: "When a talent license is about to expire",
                                },
                            ].map((pref) => (
                                <div
                                    key={pref.title}
                                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 p-4 bg-gray-50/50 border border-gray-100 rounded-xl"
                                >
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">
                                            {pref.title}
                                        </p>
                                        <p className="text-xs text-gray-500 font-medium">
                                            {pref.desc}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <Switch defaultChecked />
                                            <Label className="text-sm font-medium text-gray-700">
                                                Email
                                            </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch defaultChecked />
                                            <Label className="text-sm font-medium text-gray-700">
                                                Push
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <div className="flex justify-end">
                        <Button className="h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2">
                            <Save className="w-5 h-5" />
                            Save Preferences
                        </Button>
                    </div>
                </div>
            )}

            {activeTab === "Tax & Currency" && (
                <div className="space-y-6">
                    <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-2xl">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-orange-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                                Tax & Currency
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-900">
                                    Default Currency
                                </Label>
                                <Select defaultValue="usd">
                                    <SelectTrigger className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl">
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="usd">USD ($)</SelectItem>
                                        <SelectItem value="eur">EUR (€)</SelectItem>
                                        <SelectItem value="gbp">GBP (£)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-900">
                                    Tax Rate (%)
                                </Label>
                                <Input
                                    defaultValue="8.875"
                                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-900">
                                    Tax Name
                                </Label>
                                <Input
                                    defaultValue="Sales Tax"
                                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-900">
                                    Tax ID
                                </Label>
                                <Input
                                    defaultValue="12-3456789"
                                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                                />
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end">
                        <Button className="h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2">
                            <Save className="w-5 h-5" />
                            Save Tax Settings
                        </Button>
                    </div>
                </div>
            )}

            {activeTab === "Divisions" && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">
                                Agency Divisions
                            </h3>
                            <p className="text-sm text-gray-500 font-medium">
                                Manage talent categories and divisions
                            </p>
                        </div>
                        <Button className="h-9 px-3 sm:h-10 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Add Division
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { name: "Women", count: 45, color: "bg-pink-50 text-pink-600" },
                            { name: "Men", count: 32, color: "bg-blue-50 text-blue-600" },
                            { name: "Kids", count: 18, color: "bg-yellow-50 text-yellow-600" },
                            { name: "Curve", count: 12, color: "bg-purple-50 text-purple-600" },
                            {
                                name: "Influencers",
                                count: 24,
                                color: "bg-orange-50 text-orange-600",
                            },
                            { name: "Voice", count: 8, color: "bg-green-50 text-green-600" },
                        ].map((division) => (
                            <Card
                                key={division.name}
                                className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl hover:border-indigo-200 transition-colors cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div
                                        className={`w-10 h-10 rounded-xl ${division.color} flex items-center justify-center`}
                                    >
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 text-gray-400 hover:text-indigo-600"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </div>
                                <h4 className="text-base font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                                    {division.name}
                                </h4>
                                <p className="text-sm text-gray-500 font-medium">
                                    {division.count} Active Talent
                                </p>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === "Team" && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Team Members</h3>
                            <p className="text-sm text-gray-500 font-medium">
                                Manage access and permissions for your staff
                            </p>
                        </div>
                        <Button
                            onClick={() => setShowInviteModal(true)}
                            className="h-9 px-3 sm:h-10 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Invite User
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                role: "Admin",
                                count: 2,
                                desc: "Full access",
                                color: "bg-purple-50 text-purple-700 border-purple-100",
                            },
                            {
                                role: "Booker",
                                count: 5,
                                desc: "Manage bookings",
                                color: "bg-blue-50 text-blue-700 border-blue-100",
                            },
                            {
                                role: "Scout",
                                count: 3,
                                desc: "Add prospects",
                                color: "bg-green-50 text-green-700 border-green-100",
                            },
                            {
                                role: "Accountant",
                                count: 1,
                                desc: "Finance only",
                                color: "bg-orange-50 text-orange-700 border-orange-100",
                            },
                        ].map((role) => (
                            <div
                                key={role.role}
                                className={`p-4 rounded-xl border ${role.color} flex flex-col`}
                            >
                                <span className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">
                                    {role.role}
                                </span>
                                <span className="text-2xl font-black mb-1">{role.count}</span>
                                <span className="text-xs font-medium opacity-80">
                                    {role.desc}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 p-6 border-b border-gray-100 bg-gray-50/50">
                            <h4 className="text-base font-bold text-gray-900">
                                Active Users
                            </h4>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search users..."
                                    className="pl-9 h-9 bg-white border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {[
                                {
                                    name: "Sarah Jenkins",
                                    email: "sarah@cmmodels.com",
                                    role: "Admin",
                                    status: "Active",
                                    lastActive: "Now",
                                    avatar: "SJ",
                                },
                                {
                                    name: "Mike Ross",
                                    email: "mike@cmmodels.com",
                                    role: "Booker",
                                    status: "Active",
                                    lastActive: "2h ago",
                                    avatar: "MR",
                                },
                                {
                                    name: "Jessica Pearson",
                                    email: "jessica@cmmodels.com",
                                    role: "Admin",
                                    status: "Active",
                                    lastActive: "5h ago",
                                    avatar: "JP",
                                },
                                {
                                    name: "Rachel Zane",
                                    email: "rachel@cmmodels.com",
                                    role: "Scout",
                                    status: "Away",
                                    lastActive: "1d ago",
                                    avatar: "RZ",
                                },
                                {
                                    name: "Louis Litt",
                                    email: "louis@cmmodels.com",
                                    role: "Accountant",
                                    status: "Active",
                                    lastActive: "3h ago",
                                    avatar: "LL",
                                },
                            ].map((user) => (
                                <div
                                    key={user.email}
                                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                            {user.avatar}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">
                                                {user.name}
                                            </p>
                                            <p className="text-xs text-gray-500 font-medium">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 sm:gap-8 w-full sm:w-auto justify-between sm:justify-end">
                                        <Badge
                                            variant="secondary"
                                            className="bg-gray-100 text-gray-700 font-bold"
                                        >
                                            {user.role}
                                        </Badge>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`w-2 h-2 rounded-full ${user.status === "Active"
                                                    ? "bg-green-500"
                                                    : "bg-yellow-500"
                                                    }`}
                                            />
                                            <span className="text-xs text-gray-500 font-medium">
                                                {user.lastActive}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="w-8 h-8 text-gray-400 hover:text-gray-600"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setSelectedMember(user);
                                                            setShowPermissionsModal(true);
                                                        }}
                                                        className="font-bold text-gray-700 cursor-pointer"
                                                    >
                                                        <Shield className="w-4 h-4 mr-2" /> Permissions
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setSelectedMember(user);
                                                            setShowActivityModal(true);
                                                        }}
                                                        className="font-bold text-gray-700 cursor-pointer"
                                                    >
                                                        <History className="w-4 h-4 mr-2" /> Activity Log
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="font-bold text-red-600 cursor-pointer">
                                                        <Trash2 className="w-4 h-4 mr-2" /> Remove User
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "File Storage" && <FileStorageView />}

            {activeTab === "Integrations" && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Integrations</h3>
                            <p className="text-sm text-gray-500 font-medium">
                                Connect your agency with other tools
                            </p>
                        </div>
                        <Button className="h-9 px-3 sm:h-10 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Add Integration
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {[
                            {
                                name: "QuickBooks Online",
                                desc: "Sync invoices and payments automatically",
                                status: "Connected",
                                icon: "https://cdn.iconscout.com/icon/free/png-256/free-quickbooks-3521664-2945108.png",
                            },
                            {
                                name: "Stripe",
                                desc: "Process credit card payments for bookings",
                                status: "Connected",
                                icon: "https://cdn.iconscout.com/icon/free/png-256/free-stripe-2-498440.png",
                            },
                            {
                                name: "Slack",
                                desc: "Get notifications in your team channel",
                                status: "Not Connected",
                                icon: "https://cdn.iconscout.com/icon/free/png-256/free-slack-logo-icon-download-in-svg-png-gif-file-formats--technology-social-media-vol-6-pack-logos-icons-3030226.png",
                            },
                            {
                                name: "Google Calendar",
                                desc: "Sync bookings with your agency calendar",
                                status: "Connected",
                                icon: "https://cdn.iconscout.com/icon/free/png-256/free-google-calendar-268-721979.png",
                            },
                            {
                                name: "DocuSign",
                                desc: "Send contracts for digital signature",
                                status: "Not Connected",
                                icon: "https://cdn.iconscout.com/icon/free/png-256/free-docusign-3521408-2944852.png",
                            },
                        ].map((integration) => (
                            <div
                                key={integration.name}
                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-gray-50/50 border border-gray-100 rounded-2xl gap-4 sm:gap-0"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm p-2 flex items-center justify-center">
                                        <img
                                            src={integration.icon}
                                            alt={integration.name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-gray-900">
                                            {integration.name}
                                        </h4>
                                        <p className="text-sm text-gray-500 font-medium">
                                            {integration.desc}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                    <Badge
                                        className={`${integration.status === "Connected"
                                            ? "bg-green-100 text-green-700 border-green-200"
                                            : "bg-gray-100 text-gray-600 border-gray-200"
                                            } font-bold`}
                                    >
                                        {integration.status}
                                    </Badge>
                                    <Switch checked={integration.status === "Connected"} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <InviteTeamMemberModal
                open={showInviteModal}
                onOpenChange={setShowInviteModal}
            />
            <EditPermissionsModal
                open={showPermissionsModal}
                onOpenChange={setShowPermissionsModal}
                member={selectedMember}
            />
            <ActivityLogModal
                open={showActivityModal}
                onOpenChange={setShowActivityModal}
                member={selectedMember}
            />
        </div>
    );
};

export default GeneralSettingsView;
