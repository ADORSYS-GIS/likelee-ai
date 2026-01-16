import React from "react";
import { format, parseISO } from "date-fns";
import {
    Bell,
    Building2,
    Calendar,
    CheckCircle2,
    Copy,
    DollarSign,
    Download,
    Edit,
    Eye,
    FileText,
    Globe,
    Link,
    MapPin,
    Receipt,
    Share2,
    Trash2,
    TrendingUp,
    User,
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";

export const BookingDetailsModal = ({
    open,
    onOpenChange,
    booking,
    onEdit,
    onDuplicate,
    onCancel,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    booking: any;
    onEdit: (booking: any) => void;
    onDuplicate: (booking: any) => void;
    onCancel: (id: string) => void;
}) => {
    const { toast } = useToast();

    if (!booking) return null;

    const handleActionWithToast = (
        title: string,
        description: string,
        showOkOnly: boolean = false,
    ) => {
        const { dismiss } = toast({
            title,
            description,
            action: showOkOnly ? (
                <ToastAction altText="OK" onClick={() => dismiss()}>
                    OK
                </ToastAction>
            ) : (
                <div className="flex gap-2">
                    <ToastAction altText="Cancel" onClick={() => dismiss()}>
                        Cancel
                    </ToastAction>
                    <ToastAction altText="OK" onClick={() => dismiss()}>
                        OK
                    </ToastAction>
                </div>
            ),
        });
    };

    const handleCancel = () => {
        const { dismiss } = toast({
            title: "Are you sure you want to cancel this booking?",
            description: "This action cannot be undone.",
            action: (
                <div className="flex gap-2">
                    <ToastAction altText="Cancel" onClick={() => dismiss()}>
                        Cancel
                    </ToastAction>
                    <ToastAction
                        altText="OK"
                        onClick={() => {
                            onCancel(booking.id);
                            onOpenChange(false);
                            dismiss();
                        }}
                    >
                        OK
                    </ToastAction>
                </div>
            ),
        });
    };

    const handleComplete = () => {
        const { dismiss } = toast({
            title: "Mark this booking as completed?",
            description: "The status will be updated to Completed.",
            action: (
                <div className="flex gap-2">
                    <ToastAction altText="Cancel" onClick={() => dismiss()}>
                        Cancel
                    </ToastAction>
                    <ToastAction
                        altText="OK"
                        onClick={() => {
                            handleActionWithToast(
                                "Booking marked as completed",
                                "The status has been successfully updated.",
                                true,
                            );
                            dismiss();
                        }}
                    >
                        OK
                    </ToastAction>
                </div>
            ),
        });
    };

    const handleRemind = () => {
        const { dismiss } = toast({
            title: "Send reminder notification to talent?",
            description: "This will send a reminder to " + booking.talentName,
            action: (
                <div className="flex gap-2">
                    <ToastAction altText="Cancel" onClick={() => dismiss()}>
                        Cancel
                    </ToastAction>
                    <ToastAction
                        altText="OK"
                        onClick={() => {
                            handleActionWithToast(
                                "Reminder Sent",
                                "Notification has been sent to " + booking.talentName,
                                true,
                            );
                            dismiss();
                        }}
                    >
                        OK
                    </ToastAction>
                </div>
            ),
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl overflow-y-auto">
                <SheetHeader className="border-b pb-4">
                    <SheetTitle className="text-2xl font-black text-gray-900">
                        Booking Details
                    </SheetTitle>
                </SheetHeader>

                <div className="space-y-6 py-4">
                    <div className="flex gap-2">
                        <Badge className="bg-green-100 text-green-700 border-none font-bold">
                            Confirmed
                        </Badge>
                        <Badge variant="outline" className="font-bold border-gray-200">
                            Confirmed
                        </Badge>
                    </div>

                    <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-3">
                            <User className="w-4 h-4" /> Talent
                        </div>
                        <p className="text-lg font-black text-gray-900">
                            {booking.talentName}
                        </p>
                    </div>

                    <div className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-gray-600 font-bold text-sm">
                                <Building2 className="w-4 h-4" /> Client
                            </div>
                            <Link className="w-4 h-4 text-indigo-600 cursor-pointer" />
                        </div>
                        <p className="text-sm text-indigo-600 font-medium cursor-pointer hover:underline mb-1">
                            Click to view client profile
                        </p>
                        <p className="text-lg font-black text-gray-900">
                            {booking.clientName || "Not specified"}
                        </p>
                    </div>

                    <div className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-600 font-bold text-sm mb-3">
                            <Calendar className="w-4 h-4" /> Date & Time
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Date:</span>
                            <span className="font-bold text-gray-900">
                                {format(parseISO(booking.date), "EEEE, MMMM d, yyyy")}
                            </span>
                        </div>
                    </div>

                    <div className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-600 font-bold text-sm mb-3">
                            <MapPin className="w-4 h-4" /> Location
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-bold text-gray-900">US</p>
                                <p className="text-xs text-gray-500">Studio B</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold cursor-pointer hover:underline">
                                <Globe className="w-4 h-4" /> View on Google Maps
                            </div>
                            <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center border border-dashed border-gray-200">
                                <MapPin className="w-8 h-8 text-gray-300" />
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-600 font-bold text-sm mb-3">
                            <DollarSign className="w-4 h-4" /> Payment
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 font-medium">
                                Day Rate
                            </span>
                            <span className="text-xl font-black text-gray-900">USD $3</span>
                        </div>
                    </div>

                    <div className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-600 font-bold text-sm mb-3">
                            <FileText className="w-4 h-4" /> Usage Terms
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm font-bold text-gray-900">Digital</p>
                            <p className="text-xs text-gray-500">
                                <span className="font-bold">Duration:</span> 1 Month
                            </p>
                        </div>
                    </div>

                    <div className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-600 font-bold text-sm mb-3">
                            <Edit className="w-4 h-4" /> Special Instructions
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm text-gray-700 leading-relaxed">
                                {booking.notes || "bla bla"}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                            onClick={() => onEdit(booking)}
                        >
                            <Edit className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button
                            variant="outline"
                            className="font-bold text-gray-700 border-gray-200"
                            onClick={() => onDuplicate(booking)}
                        >
                            <Copy className="w-4 h-4 mr-2" /> Duplicate
                        </Button>
                        <Button
                            variant="outline"
                            className="font-bold text-green-600 border-green-200 hover:bg-green-50"
                            onClick={handleComplete}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Complete
                        </Button>
                        <Button
                            variant="outline"
                            className="font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            onClick={handleRemind}
                        >
                            <Bell className="w-4 h-4 mr-2" /> Remind
                        </Button>
                        <Button
                            variant="outline"
                            className="font-bold text-gray-700 border-gray-200 col-span-1"
                            onClick={() =>
                                handleActionWithToast(
                                    "PDF download feature coming soon!",
                                    "",
                                    true,
                                )
                            }
                        >
                            <Download className="w-4 h-4 mr-2" /> Download PDF
                        </Button>
                        <Button
                            variant="outline"
                            className="font-bold text-gray-700 border-gray-200 col-span-1"
                            onClick={() =>
                                handleActionWithToast(
                                    "Invoice generation feature coming soon!",
                                    "",
                                    true,
                                )
                            }
                        >
                            <Receipt className="w-4 h-4 mr-2" /> Generate Invoice
                        </Button>
                        <Button
                            variant="outline"
                            className="font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 col-span-2"
                            onClick={() => {
                                const shareUrl = `${window.location.origin}/booking/shared/${booking.id}`;
                                navigator.clipboard.writeText(shareUrl);
                                handleActionWithToast(
                                    "Booking link copied to clipboard!",
                                    shareUrl,
                                    true,
                                );
                            }}
                        >
                            <Share2 className="w-4 h-4 mr-2" /> Share Booking Link
                        </Button>
                        <Button
                            variant="outline"
                            className="font-bold text-red-600 border-red-200 hover:bg-red-50 col-span-2"
                            onClick={handleCancel}
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Cancel Booking
                        </Button>
                    </div>

                    <div className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-600 font-bold text-sm mb-4">
                            <TrendingUp className="w-4 h-4" /> Activity Log
                        </div>
                        <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                            <div className="relative pl-8">
                                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white shadow-sm" />
                                <p className="text-sm font-bold text-gray-900">
                                    Booking Created
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Jan 12, 2026 @ 3:29 PM
                                </p>
                                <p className="text-xs text-gray-400">
                                    by leleivanlele22@gmail.com
                                </p>
                            </div>
                            <div className="relative pl-8">
                                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-purple-600 border-4 border-white shadow-sm" />
                                <p className="text-sm font-bold text-gray-900">
                                    Talent Viewed Booking
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Jan 12, 2026 @ 3:29 PM
                                </p>
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                    <Eye className="w-3 h-3" /> 3 times
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-center text-gray-400 pt-2 font-medium">
                        Booking ID: 6965134959dd90fe62a25ba3
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    );
};
