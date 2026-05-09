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
  File,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { base44 } from "@/api/base44Client";
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
  isSportsAgency = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  onEdit: (booking: any) => void;
  onDuplicate: (booking: any) => void;
  onCancel: (id: string) => void;
  isSportsAgency?: boolean;
}) => {
  const { toast } = useToast();
  const { t } = useTranslation("agency");
  const entitySingularTitle = isSportsAgency
    ? t("agencyDashboard.bookings.bookingDetails.athlete")
    : t("agencyDashboard.bookings.bookingDetails.talent");
  const entitySingularLower = isSportsAgency ? "athlete" : "talent";

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
      title: t("agencyDashboard.bookings.bookingDetails.toasts.cancelTitle"),
      description: t(
        "agencyDashboard.bookings.bookingDetails.toasts.cancelDesc",
      ),
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
      title: t("agencyDashboard.bookings.bookingDetails.toasts.completeTitle"),
      description: t(
        "agencyDashboard.bookings.bookingDetails.toasts.completeDesc",
      ),
      action: (
        <div className="flex gap-2">
          <ToastAction altText="Cancel" onClick={() => dismiss()}>
            Cancel
          </ToastAction>
          <ToastAction
            altText="OK"
            onClick={() => {
              handleActionWithToast(
                t(
                  "agencyDashboard.bookings.bookingDetails.toasts.completeSuccess",
                ),
                t(
                  "agencyDashboard.bookings.bookingDetails.toasts.completeSuccessDesc",
                ),
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
      title: t("agencyDashboard.bookings.bookingDetails.toasts.remindTitle", {
        entity: entitySingularLower,
      }),
      description: t(
        "agencyDashboard.bookings.bookingDetails.toasts.remindDesc",
        { name: booking.talentName },
      ),
      action: (
        <div className="flex gap-2">
          <ToastAction altText="Cancel" onClick={() => dismiss()}>
            Cancel
          </ToastAction>
          <ToastAction
            altText="OK"
            onClick={() => {
              handleActionWithToast(
                t(
                  "agencyDashboard.bookings.bookingDetails.toasts.remindSuccess",
                ),
                t(
                  "agencyDashboard.bookings.bookingDetails.toasts.remindSuccessDesc",
                  { name: booking.talentName },
                ),
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

  const handleDownloadFile = async (file: any) => {
    const bookingId = String(booking?.id || "").trim();
    const fileId = String(file?.id || "").trim();
    if (!bookingId || !fileId) return;
    try {
      const response = await base44.getRaw(
        `/api/bookings/${encodeURIComponent(bookingId)}/files/${encodeURIComponent(fileId)}`,
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: t(
          "agencyDashboard.bookings.bookingDetails.toasts.downloadStarted",
        ),
        description: t(
          "agencyDashboard.bookings.bookingDetails.toasts.downloading",
          { name: file.file_name },
        ),
      });
    } catch (e: any) {
      console.error("Storage download failed:", e);
      const detail =
        e.message ||
        e.error_description ||
        (typeof e === "object" ? JSON.stringify(e) : String(e));
      toast({
        title: t(
          "agencyDashboard.bookings.bookingDetails.toasts.downloadFailed",
        ),
        description:
          detail ||
          t("agencyDashboard.bookings.bookingDetails.toasts.couldNotDownload"),
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-2xl font-black text-gray-900">
            {t("agencyDashboard.bookings.bookingDetails.title")}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          <div className="flex gap-2">
            <Badge className="bg-green-100 text-green-700 border-none font-bold">
              {t("agencyDashboard.bookings.bookingDetails.status.confirmed")}
            </Badge>
            <Badge variant="outline" className="font-bold border-gray-200">
              {t("agencyDashboard.bookings.bookingDetails.status.confirmed")}
            </Badge>
          </div>

          <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-3">
              <User className="w-4 h-4" /> {entitySingularTitle}
            </div>
            <p className="text-lg font-black text-gray-900">
              {booking.talentName}
            </p>
          </div>

          <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-600 font-bold text-sm">
                <Building2 className="w-4 h-4" />{" "}
                {t("agencyDashboard.bookings.bookingDetails.client")}
              </div>
              <Link className="w-4 h-4 text-indigo-600 cursor-pointer" />
            </div>
            <p className="text-sm text-indigo-600 font-medium cursor-pointer hover:underline mb-1">
              {t("agencyDashboard.bookings.bookingDetails.clientProfile")}
            </p>
            <p className="text-lg font-black text-gray-900">
              {booking.clientName ||
                t("agencyDashboard.bookings.bookingDetails.notSpecified")}
            </p>
          </div>

          <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-600 font-bold text-sm mb-3">
              <Calendar className="w-4 h-4" />{" "}
              {t("agencyDashboard.bookings.bookingDetails.dateTime")}
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">
                {t("agencyDashboard.bookings.bookingDetails.dateLabel")}
              </span>
              <span className="font-bold text-gray-900">
                {format(parseISO(booking.date), "EEEE, MMMM d, yyyy")}
              </span>
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-600 font-bold text-sm mb-3">
              <MapPin className="w-4 h-4" />{" "}
              {t("agencyDashboard.bookings.bookingDetails.location")}
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-bold text-gray-900">US</p>
                <p className="text-xs text-gray-500">Studio B</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold cursor-pointer hover:underline">
                <Globe className="w-4 h-4" />{" "}
                {t("agencyDashboard.bookings.bookingDetails.viewOnMap")}
              </div>
              <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center border border-dashed border-gray-200">
                <MapPin className="w-8 h-8 text-gray-300" />
              </div>
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-600 font-bold text-sm mb-3">
              <DollarSign className="w-4 h-4" />{" "}
              {t("agencyDashboard.bookings.bookingDetails.payment")}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 font-medium">
                {t("agencyDashboard.bookings.bookingDetails.dayRate")}
              </span>
              <span className="text-xl font-black text-gray-900">USD $3</span>
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-600 font-bold text-sm mb-3">
              <FileText className="w-4 h-4" />{" "}
              {t("agencyDashboard.bookings.bookingDetails.usageTerms")}
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-bold text-gray-900">Digital</p>
              <p className="text-xs text-gray-500">
                <span className="font-bold">
                  {t("agencyDashboard.bookings.bookingDetails.duration")}
                </span>{" "}
                1 Month
              </p>
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-600 font-bold text-sm mb-3">
              <Edit className="w-4 h-4" />{" "}
              {t("agencyDashboard.bookings.bookingDetails.specialInstructions")}
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                {booking.notes || "bla bla"}
              </p>
            </div>
          </div>

          {booking.booking_files && booking.booking_files.length > 0 && (
            <div className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-600 font-bold text-sm mb-3">
                <Link className="w-4 h-4" />{" "}
                {t("agencyDashboard.bookings.bookingDetails.attachments")}
              </div>
              <div className="space-y-2">
                {booking.booking_files.map((file: any) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <span
                        className="text-sm font-medium text-gray-700 truncate"
                        title={file.file_name}
                      >
                        {file.file_name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDownloadFile(file)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              onClick={() => onEdit(booking)}
            >
              <Edit className="w-4 h-4 mr-2" />{" "}
              {t("agencyDashboard.bookings.bookingDetails.buttons.edit")}
            </Button>
            <Button
              variant="outline"
              className="font-bold text-gray-700 border-gray-200"
              onClick={() => onDuplicate(booking)}
            >
              <Copy className="w-4 h-4 mr-2" />{" "}
              {t("agencyDashboard.bookings.bookingDetails.buttons.duplicate")}
            </Button>
            <Button
              variant="outline"
              className="font-bold text-green-600 border-green-200 hover:bg-green-50"
              onClick={handleComplete}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />{" "}
              {t("agencyDashboard.bookings.bookingDetails.buttons.complete")}
            </Button>
            <Button
              variant="outline"
              className="font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              onClick={handleRemind}
            >
              <Bell className="w-4 h-4 mr-2" />{" "}
              {t("agencyDashboard.bookings.bookingDetails.buttons.remind")}
            </Button>
            <Button
              variant="outline"
              className="font-bold text-gray-700 border-gray-200 col-span-1"
              onClick={() =>
                handleActionWithToast(
                  t(
                    "agencyDashboard.bookings.bookingDetails.toasts.pdfComingSoon",
                  ),
                  "",
                  true,
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />{" "}
              {t("agencyDashboard.bookings.bookingDetails.buttons.downloadPdf")}
            </Button>
            <Button
              variant="outline"
              className="font-bold text-gray-700 border-gray-200 col-span-1"
              onClick={() =>
                handleActionWithToast(
                  t(
                    "agencyDashboard.bookings.bookingDetails.toasts.invoiceComingSoon",
                  ),
                  "",
                  true,
                )
              }
            >
              <Receipt className="w-4 h-4 mr-2" />{" "}
              {t(
                "agencyDashboard.bookings.bookingDetails.buttons.generateInvoice",
              )}
            </Button>
            <Button
              variant="outline"
              className="font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 col-span-2"
              onClick={() => {
                const shareUrl = `${window.location.origin}/booking/shared/${booking.id}`;
                navigator.clipboard.writeText(shareUrl);
                handleActionWithToast(
                  t(
                    "agencyDashboard.bookings.bookingDetails.toasts.linkCopied",
                  ),
                  shareUrl,
                  true,
                );
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />{" "}
              {t("agencyDashboard.bookings.bookingDetails.buttons.shareLink")}
            </Button>
            <Button
              variant="outline"
              className="font-bold text-red-600 border-red-200 hover:bg-red-50 col-span-2"
              onClick={handleCancel}
            >
              <Trash2 className="w-4 h-4 mr-2" />{" "}
              {t(
                "agencyDashboard.bookings.bookingDetails.buttons.cancelBooking",
              )}
            </Button>
          </div>

          <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-600 font-bold text-sm mb-4">
              <TrendingUp className="w-4 h-4" />{" "}
              {t("agencyDashboard.bookings.bookingDetails.activityLog")}
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
            {t("agencyDashboard.bookings.bookingDetails.bookingId")}{" "}
            {booking.id}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
