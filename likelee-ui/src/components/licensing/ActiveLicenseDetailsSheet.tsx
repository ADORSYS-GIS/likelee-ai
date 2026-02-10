import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ActiveLicense } from "@/api/activeLicenses";
import {
  Calendar,
  DollarSign,
  FileText,
  User,
  Briefcase,
  RefreshCw,
} from "lucide-react";

interface ActiveLicenseDetailsSheetProps {
  license: ActiveLicense | null;
  open: boolean;
  onClose: () => void;
  onRenew?: (license: ActiveLicense) => void;
}

export const ActiveLicenseDetailsSheet: React.FC<
  ActiveLicenseDetailsSheetProps
> = ({ license, open, onClose, onRenew }) => {
  if (!license) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(val / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">ACTIVE</Badge>
        );
      case "Expiring":
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600">EXPIRING</Badge>
        );
      case "Expired":
        return <Badge className="bg-red-500 hover:bg-red-600">EXPIRED</Badge>;
      default:
        return <Badge variant="secondary">{status.toUpperCase()}</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>License Details</SheetTitle>
          <SheetDescription>
            View comprehensive details for this license.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col items-center justify-center text-center space-y-2 pb-4 border-b">
            <Avatar className="h-20 w-20 border-2 border-white shadow-sm">
              <AvatarImage
                src={license.talent_avatar}
                alt={license.talent_name}
              />
              <AvatarFallback>
                {license.talent_name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-bold">{license.talent_name}</h3>
              <p className="text-sm text-muted-foreground">Talent</p>
            </div>
            {getStatusBadge(license.status)}
          </div>

          {/* Key Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> Client/Brand
              </span>
              <p className="font-medium text-sm">{license.brand}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" /> License Type
              </span>
              <p className="font-medium text-sm">{license.license_type}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Start Date
              </span>
              <p className="font-medium text-sm">
                {license.start_date || "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> End Date
              </span>
              <p className="font-medium text-sm">{license.end_date || "N/A"}</p>
            </div>
          </div>

          {/* Value Badge */}
          <div className="bg-indigo-50 p-4 rounded-lg flex justify-between items-center border border-indigo-100">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-100 p-2 rounded-full">
                <DollarSign className="h-5 w-5 text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-indigo-900">
                Total License Value
              </span>
            </div>
            <span className="text-xl font-bold text-indigo-700">
              {formatCurrency(license.value)}
            </span>
          </div>

          {/* Detailed Sections */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold border-b pb-1">
              Usage & Rights
            </h4>

            <div className="space-y-2">
              <div>
                <span className="text-xs text-muted-foreground block">
                  Usage Scope
                </span>
                <p className="text-sm">{license.usage_scope}</p>
              </div>
              {/* We could add generic fields here if they exist in the model, or placeholders */}
            </div>
          </div>

          {/* Additional Metadata if available */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold border-b pb-1">Timeline</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days Remaining:</span>
                <span
                  className={
                    license.days_left && license.days_left < 30
                      ? "text-orange-600 font-bold"
                      : ""
                  }
                >
                  {license.days_left !== undefined
                    ? `${license.days_left} days`
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="mt-8">
          {onRenew && (
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={() => onRenew(license)}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Renew License
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
