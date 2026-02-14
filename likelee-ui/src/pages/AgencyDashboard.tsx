import React, { useEffect, useMemo, useState } from "react";
import { LicenseTemplatesTab } from "@/components/licensing/LicenseTemplatesTab";
import { LicenseSubmissionsTab } from "@/components/licensing/LicenseSubmissionsTab";
import { LicensingRequestsTab } from "@/components/licensing/LicensingRequestsTab";
import { ActiveLicenseDetailsSheet } from "@/components/licensing/ActiveLicenseDetailsSheet";
import { scoutingService } from "@/services/scoutingService";
import { ScoutingEvent, ScoutingProspect } from "@/types/scouting";
import { ScoutingMap } from "@/components/scouting/map/ScoutingMap";
import { ScoutingTrips } from "@/components/scouting/ScoutingTrips";
import { ScoutingEventModal } from "@/components/scouting/ScoutingEventModal";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { searchLocations } from "@/components/scouting/map/geocoding";
import { CreatePackageWizard } from "@/components/packages/CreatePackageWizard";
import { PackagesView } from "@/components/packages/PackagesView";
import {
  LayoutDashboard,
  Users,
  FileText,
  Shield,
  Navigation,
  BarChart2,
  Settings,
  LogOut,
  Bell,
  HelpCircle,
  User,
  Search,
  Instagram,
  ArrowUpDown,
  ArrowLeft,
  X,
  Trophy,
  DollarSign,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Plus,
  Download,
  Filter,
  Target,
  MoreHorizontal,
  ShieldAlert,
  Calendar,
  Clock,
  Eye,
  RefreshCw,
  CheckCircle2,
  Copy,
  Edit,
  Trash2,
  ShieldCheck,
  XCircle,
  Link,
  Percent,
  History,
  Save,
  ArrowRight,
  Building2,
  CreditCard,
  Folder,
  Phone,
  Mail,
  Package,
  Globe,
  Video,
  File,
  Tag,
  HardDrive,
  Grid,
  List,
  MoreVertical,
  Share2,
  Upload,
  FolderPlus,
  FolderOpen,
  Briefcase,
  Receipt,
  Megaphone,
  Calculator,
  FileDown,
  Send,
  Printer,
  Files,
  TrendingDown,
  AlertTriangle,
  MapPin,
  Star,
  Menu,
  Image as ImageIcon,
  Loader2,
  Mic,
  Link as LinkIcon,
  Pencil,
} from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BookingsView } from "@/components/Bookings/BookingsView";
import GeneralSettingsView from "@/components/dashboard/settings/GeneralSettingsView";
import AgencyDashboardView from "@/components/agency/DashboardView";
import FileStorageView from "@/components/dashboard/settings/FileStorageView";
import AgencyRosterView from "@/components/agency/RosterView";
import PerformanceTiers from "@/components/dashboard/PerformanceTiers";
import {
  getAgencyRoster,
  getAgencyProfile,
  getAgencyDashboardOverview,
  getAgencyTalentPerformance,
  getAgencyRevenueBreakdown,
  getAgencyLicensingPipeline,
  getAgencyRecentActivity,
  getAgencyLicensingRequests,
  updateAgencyLicensingRequestsStatus,
  getAgencyLicensingRequestsPaySplit,
  setAgencyLicensingRequestsPaySplit,
  listBookings,
  createBooking as apiCreateBooking,
  updateBooking as apiUpdateBooking,
  cancelBooking as apiCancelBooking,
  listBookOuts,
  createBookOut,
  getAgencyClients,
  getAgencyTalents,
  listInvoices,
  listTalentStatements,
  listExpenses,
  createExpense,
  getAgencyPayoutsAccountStatus,
  getAgencyStripeOnboardingLink,
  notifyBookingCreatedEmail,
  createInvoice,
  markInvoiceSent,
  markInvoicePaid,
  uploadAgencyFile,
  sendEmail,
  getAgencyActiveLicenses,
  getAgencyActiveLicensesStats,
} from "@/api/functions";
import ClientCRMView from "@/components/crm/ClientCRMView";
import * as crmApi from "@/api/crm";

const STATUS_MAP: { [key: string]: string } = {
  new_lead: "New Lead",
  in_contact: "In Contact",
  test_shoot_pending: "Test Shoot (Pending)",
  test_shoot_success: "Test Shoot (Success)",
  test_shoot_failed: "Test Shoot (Failed)",
  offer_sent: "Offer Sent",
  opened: "Offer Opened",
  signed: "Signed",
  declined: "Declined",
};

const MANUAL_STATUSES = [
  "new_lead",
  "in_contact",
  "test_shoot_pending",
  "test_shoot_success",
  "test_shoot_failed",
  "offer_sent",
];

const STATUS_COLORS: { [key: string]: string } = {
  new_lead: "bg-blue-50 text-blue-700 border-blue-200",
  in_contact: "bg-yellow-50 text-yellow-700 border-yellow-200",
  test_shoot_pending: "bg-orange-50 text-orange-700 border-orange-200",
  test_shoot_success: "bg-teal-50 text-teal-700 border-teal-200",
  test_shoot_failed: "bg-rose-50 text-rose-700 border-rose-200",
  offer_sent: "bg-purple-50 text-purple-700 border-purple-200",
  opened: "bg-yellow-50 text-yellow-700 border-yellow-200",
  signed: "bg-green-50 text-green-700 border-green-200",
  declined: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_DOT_COLORS: { [key: string]: string } = {
  new_lead: "bg-blue-500",
  in_contact: "bg-yellow-500",
  test_shoot_pending: "bg-orange-500",
  test_shoot_success: "bg-teal-500",
  test_shoot_failed: "bg-rose-500",
  offer_sent: "bg-purple-500",
  opened: "bg-yellow-500",
  signed: "bg-green-500",
  declined: "bg-red-500",
};

const ConnectBankView = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    connected: boolean;
    payouts_enabled: boolean;
    transfers_enabled: boolean;
    last_error: string;
    bank_last4?: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const resp = await getAgencyPayoutsAccountStatus();
        const data = (resp as any)?.data ?? resp;
        if (!mounted) return;
        setStatus({
          connected: Boolean((data as any)?.connected),
          payouts_enabled: Boolean((data as any)?.payouts_enabled),
          transfers_enabled: Boolean((data as any)?.transfers_enabled),
          last_error: String((data as any)?.last_error || ""),
          bank_last4: String((data as any)?.bank_last4 || "") || undefined,
        });
      } catch (e: any) {
        toast({
          title: "Failed to load bank connection status",
          description: String(e?.message || e),
          variant: "destructive" as any,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const connect = async () => {
    setLoading(true);
    try {
      const resp = await getAgencyStripeOnboardingLink();
      const url = String((resp as any)?.data?.url || "");
      if (!url) {
        throw new Error("Missing Stripe onboarding URL");
      }
      window.location.href = url;
    } catch (e: any) {
      toast({
        title: "Failed to start Stripe onboarding",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    } finally {
      setLoading(false);
    }
  };

  const connected = Boolean(status?.connected);
  const accountLast4 = String(status?.bank_last4 || "").trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Connect Your Bank Account
          </h2>
          <p className="text-gray-600 font-medium">
            Link your bank account to receive direct payments from clients and
            manage payouts to talent
          </p>
        </div>
        <Button
          variant="outline"
          className="h-10 px-5 rounded-xl border-gray-200 font-bold flex items-center gap-2"
          onClick={connect}
          disabled={loading}
        >
          <CreditCard className="w-4 h-4" />
          {connected ? "Change account" : "Connect Bank Account"}
        </Button>
      </div>

      <Card className="p-8 bg-white border border-gray-100 rounded-2xl">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Connect Your Bank Account
            </h3>
            <p className="text-sm text-gray-600 font-medium mt-1">
              Link your bank account to receive direct payments from clients and
              manage payouts to talent
            </p>
          </div>

          {connected && (
            <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">
                  Bank account connected
                </p>
                {!!accountLast4 && (
                  <p className="text-xs text-gray-600 font-medium mt-1">
                    Account ending in ••••{accountLast4}
                  </p>
                )}
              </div>
            </div>
          )}

          {!!status?.last_error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">
                  Last payout error
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  {status.last_error}
                </p>
              </div>
            </div>
          )}

          <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl mb-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-bold text-gray-900">
                Why Connect Your Bank?
              </p>
            </div>
            <div className="space-y-2">
              {[
                "Receive invoice payments directly to your account",
                "Automate talent commission payouts",
                "Track cash flow and reconcile payments",
                "Bank-level security with 256-bit encryption",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <p className="text-xs text-gray-700 font-medium">{t}</p>
                </div>
              ))}
            </div>
          </div>

          <Button
            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold flex items-center justify-center gap-2"
            onClick={connect}
            disabled={loading}
          >
            <Link className="w-4 h-4" />
            {connected ? "Change account" : "Connect with Stripe"}
          </Button>

          <div className="text-center mt-4">
            <p className="text-xs text-gray-500 font-medium">
              Powered by Stripe Connect
            </p>
            <p className="text-[10px] text-gray-400 font-medium">
              Bank-level security • SOC 2 certified • PCI DSS compliant
            </p>
          </div>

          <Card className="p-4 bg-gray-50 border border-gray-100 rounded-xl mt-6">
            <p className="text-xs font-bold text-gray-700 mb-2">
              What you'll need:
            </p>
            <div className="text-xs text-gray-600 font-medium space-y-1">
              <div>
                Business bank account details (routing & account number)
              </div>
              <div>Business tax ID (EIN or SSN)</div>
              <div>Business address and contact information</div>
              <div>Government-issued ID for verification</div>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
};

const ProspectModal = ({
  open,
  onOpenChange,
  prospect = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect?: ScoutingProspect | null;
}) => {
  const { user } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [starRating, setStarRating] = useState(3);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    instagram: "",
    source: "instagram",
    discoveryDate: new Date().toISOString().split("T")[0],
    discoveryLocation: "",
    referredBy: "",
    status: "new",
    assignedAgent: "",
    notes: "",
    instagramFollowers: 10000,
    engagementRate: 4.5,
  });

  useEffect(() => {
    if (prospect) {
      setFormData({
        name: prospect.full_name,
        email: prospect.email || "",
        phone: prospect.phone || "",
        instagram: prospect.instagram_handle || "",
        source: prospect.source || "instagram",
        discoveryDate:
          prospect.discovery_date || new Date().toISOString().split("T")[0],
        discoveryLocation: prospect.discovery_location || "",
        referredBy: prospect.referred_by || "",
        status: prospect.status,
        assignedAgent: prospect.assigned_agent_name || "",
        notes: prospect.notes || "",
        instagramFollowers: prospect.instagram_followers || 10000,
        engagementRate: prospect.engagement_rate || 4.5,
      });
      setSelectedCategories(prospect.categories || []);
      setStarRating(prospect.rating || 3);
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        instagram: "",
        source: "instagram",
        discoveryDate: new Date().toISOString().split("T")[0],
        discoveryLocation: "",
        referredBy: "",
        status: "new",
        assignedAgent: "",
        notes: "",
        instagramFollowers: 10000,
        engagementRate: 4.5,
      });
      setSelectedCategories([]);
      setStarRating(3);
    }
  }, [prospect, open]);

  const { toast } = useToast();

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const queryClient = useQueryClient();

  const handleSaveProspect = async () => {
    try {
      if (!formData.name) {
        toast({
          title: "Missing Information",
          description: "Please enter a name for the prospect.",
          variant: "destructive",
        });
        return;
      }

      setIsSaving(true);

      const agencyId = await scoutingService.getUserAgencyId();
      if (!agencyId) {
        toast({
          title: "Error",
          description:
            "Could not identify your agency. Please try logging in again.",
          variant: "destructive",
        });
        return;
      }

      if (!prospect) {
        // Check for duplicates only when adding new
        const existing = await scoutingService.checkDuplicate(
          agencyId,
          formData.email || undefined,
          formData.instagram || undefined,
        );

        if (existing) {
          toast({
            title: "Prospect Already Exists",
            description: `This prospect (${existing.full_name}) is already in your pipeline.`,
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }

        await scoutingService.createProspect({
          agency_id: agencyId,
          full_name: formData.name,
          email: formData.email,
          phone: formData.phone,
          instagram_handle: formData.instagram,
          categories: selectedCategories,
          rating: starRating,
          source: formData.source as any,
          discovery_date: formData.discoveryDate,
          discovery_location: formData.discoveryLocation,
          referred_by: formData.referredBy,
          status: formData.status as any,
          assigned_agent_name: formData.assignedAgent,
          notes: formData.notes,
          instagram_followers: formData.instagramFollowers,
          engagement_rate: formData.engagementRate,
        });

        toast({
          title: "Prospect Added",
          description: `${formData.name} has been added to your pipeline.`,
        });
      } else {
        // Update existing prospect
        await scoutingService.updateProspect(prospect.id, {
          full_name: formData.name,
          email: formData.email,
          phone: formData.phone,
          instagram_handle: formData.instagram,
          categories: selectedCategories,
          rating: starRating,
          source: formData.source as any,
          discovery_date: formData.discoveryDate,
          discovery_location: formData.discoveryLocation,
          referred_by: formData.referredBy,
          status: formData.status as any,
          assigned_agent_name: formData.assignedAgent,
          notes: formData.notes,
          instagram_followers: formData.instagramFollowers,
          engagement_rate: formData.engagementRate,
        });

        toast({
          title: "Prospect Updated",
          description: `${formData.name}'s information has been updated.`,
        });
      }

      // Invalidate the prospects query to trigger a refetch
      await queryClient.invalidateQueries({
        queryKey: ["prospects", user?.id],
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving prospect:", error);
      toast({
        title: "Error",
        description: "Failed to save prospect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {prospect ? "Edit Prospect" : "Add New Prospect"}
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
                <Input
                  id="name"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram Handle</Label>
                <Input
                  id="instagram"
                  placeholder="@username"
                  value={formData.instagram}
                  onChange={(e) =>
                    handleInputChange("instagram", e.target.value)
                  }
                />
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
                  variant={
                    selectedCategories.includes(cat) ? "default" : "secondary"
                  }
                  onClick={() => toggleCategory(cat)}
                  className={`${
                    selectedCategories.includes(cat)
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  } font-medium`}
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
                <Select
                  value={formData.source}
                  onValueChange={(val) => handleInputChange("source", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="street">Street Scouting</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discovery Date</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.discoveryDate}
                    onChange={(e) =>
                      handleInputChange("discoveryDate", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Discovery Location</Label>
                <Input
                  placeholder="New York, NY"
                  value={formData.discoveryLocation}
                  onChange={(e) =>
                    handleInputChange("discoveryLocation", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Referred By</Label>
                <Input
                  placeholder="Name of referrer"
                  value={formData.referredBy}
                  onChange={(e) =>
                    handleInputChange("referredBy", e.target.value)
                  }
                />
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
                <Select
                  value={formData.status}
                  onValueChange={(val) => handleInputChange("status", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_MAP).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned Agent</Label>
                <Input
                  placeholder="Agent name"
                  value={formData.assignedAgent}
                  onChange={(e) =>
                    handleInputChange("assignedAgent", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2">Star Rating</h3>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-8 h-8 cursor-pointer ${i <= starRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                  onClick={() => setStarRating(i)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Internal Notes</Label>
            <Textarea
              placeholder="Add notes about this prospect..."
              className="h-32"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 mb-4">
              Social Media (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Instagram Followers</Label>
                <Input
                  type="number"
                  value={formData.instagramFollowers || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "instagramFollowers",
                      e.target.value === "" ? 0 : parseFloat(e.target.value),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Engagement Rate (%)</Label>
                <Input
                  type="number"
                  value={formData.engagementRate || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "engagementRate",
                      e.target.value === "" ? 0 : parseFloat(e.target.value),
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
              onClick={handleSaveProspect}
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </div>
              ) : prospect ? (
                "Update Prospect"
              ) : (
                "Add Prospect"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// duplicate imports removed below (already imported earlier in file)
import { useAuth } from "@/auth/AuthProvider";

// STATUS_MAP is defined earlier in this file; removing duplicate declaration here.

const ConnectBankViewAlt = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    connected: boolean;
    payouts_enabled: boolean;
    transfers_enabled: boolean;
    last_error: string;
    bank_last4?: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const resp = await getAgencyPayoutsAccountStatus();
        const data = (resp as any)?.data ?? resp;
        if (!mounted) return;
        setStatus({
          connected: Boolean((data as any)?.connected),
          payouts_enabled: Boolean((data as any)?.payouts_enabled),
          transfers_enabled: Boolean((data as any)?.transfers_enabled),
          last_error: String((data as any)?.last_error || ""),
          bank_last4: String((data as any)?.bank_last4 || "") || undefined,
        });
      } catch (e: any) {
        toast({
          title: "Failed to load bank connection status",
          description: String(e?.message || e),
          variant: "destructive" as any,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const connect = async () => {
    setLoading(true);
    try {
      const resp = await getAgencyStripeOnboardingLink();
      const url = String((resp as any)?.data?.url || "");
      if (!url) {
        throw new Error("Missing Stripe onboarding URL");
      }
      window.location.href = url;
    } catch (e: any) {
      toast({
        title: "Failed to start Stripe onboarding",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    } finally {
      setLoading(false);
    }
  };

  const connected = Boolean(status?.connected);
  const ready = Boolean(status?.payouts_enabled || status?.transfers_enabled);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Connect Your Bank Account
          </h2>
          <p className="text-gray-600 font-medium">
            Link your bank account to receive direct payments from clients and
            manage payouts to talent
          </p>
        </div>
        <Button
          variant="outline"
          className="h-10 px-5 rounded-xl border-gray-200 font-bold flex items-center gap-2"
          onClick={connect}
          disabled={loading}
        >
          <CreditCard className="w-4 h-4" />
          {connected ? "Change account" : "Connect Bank Account"}
        </Button>
      </div>

      <Card className="p-8 bg-white border border-gray-100 rounded-2xl">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Connect Your Bank Account
            </h3>
            <p className="text-sm text-gray-600 font-medium mt-1">
              Link your bank account to receive direct payments from clients and
              manage payouts to talent
            </p>
          </div>

          {connected && (
            <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">
                  Bank account connected
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  {ready
                    ? "Payouts enabled"
                    : "Connection created — complete onboarding in Stripe to enable payouts"}
                </p>
                {!!status?.bank_last4 && (
                  <p className="text-xs text-gray-600 font-medium mt-1">
                    Account ending in ••••{status.bank_last4}
                  </p>
                )}
              </div>
            </div>
          )}

          {!!status?.last_error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">
                  Last payout error
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  {status.last_error}
                </p>
              </div>
            </div>
          )}

          <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl mb-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-bold text-gray-900">
                Why Connect Your Bank?
              </p>
            </div>
            <div className="space-y-2">
              {[
                "Receive invoice payments directly to your account",
                "Automate talent commission payouts",
                "Track cash flow and reconcile payments",
                "Bank-level security with 256-bit encryption",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <p className="text-xs text-gray-700 font-medium">{t}</p>
                </div>
              ))}
            </div>
          </div>

          <Button
            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold flex items-center justify-center gap-2"
            onClick={connect}
            disabled={loading}
          >
            <Link className="w-4 h-4" />
            {connected ? "Change account" : "Connect with Stripe"}
          </Button>

          <div className="text-center mt-4">
            <p className="text-xs text-gray-500 font-medium">
              Powered by Stripe Connect
            </p>
            <p className="text-[10px] text-gray-400 font-medium">
              Bank-level security • SOC 2 certified • PCI DSS compliant
            </p>
          </div>

          <Card className="p-4 bg-gray-50 border border-gray-100 rounded-xl mt-6">
            <p className="text-xs font-bold text-gray-700 mb-2">
              What you'll need:
            </p>
            <div className="text-xs text-gray-600 font-medium space-y-1">
              <div>
                Business bank account details (routing & account number)
              </div>
              <div>Business tax ID (EIN or SSN)</div>
              <div>Business address and contact information</div>
              <div>Government-issued ID for verification</div>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
};

const ProspectModalAlt = ({
  open,
  onOpenChange,
  prospect = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect?: ScoutingProspect | null;
}) => {
  const { user } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [starRating, setStarRating] = useState(3);
  const [isSaving, setIsSaving] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<
    { name: string; lat: number; lng: number }[]
  >([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleLocationSearch = async (query: string) => {
    handleInputChange("discoveryLocation", query);
    if (query.length >= 3) {
      setIsSearchingLocation(true);
      try {
        const results = await searchLocations(query);
        setLocationSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Location search error:", error);
      } finally {
        setIsSearchingLocation(false);
      }
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    instagram: "",
    source: "instagram",
    discoveryDate: new Date().toISOString().split("T")[0],
    discoveryLocation: "",
    referredBy: "",
    status: "new",
    assignedAgent: "",
    notes: "",
    instagramFollowers: 10000,
    engagementRate: 4.5,
  });

  useEffect(() => {
    if (prospect) {
      setFormData({
        name: prospect.full_name,
        email: prospect.email || "",
        phone: prospect.phone || "",
        instagram: prospect.instagram_handle || "",
        source: prospect.source || "instagram",
        discoveryDate:
          prospect.discovery_date || new Date().toISOString().split("T")[0],
        discoveryLocation: prospect.discovery_location || "",
        referredBy: prospect.referred_by || "",
        status: prospect.status,
        assignedAgent: prospect.assigned_agent_name || "",
        notes: prospect.notes || "",
        instagramFollowers: prospect.instagram_followers || 10000,
        engagementRate: prospect.engagement_rate || 4.5,
      });
      setSelectedCategories(prospect.categories || []);
      setStarRating(prospect.rating || 3);
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        instagram: "",
        source: "instagram",
        discoveryDate: new Date().toISOString().split("T")[0],
        discoveryLocation: "",
        referredBy: "",
        status: "new",
        assignedAgent: "",
        notes: "",
        instagramFollowers: 10000,
        engagementRate: 4.5,
      });
      setSelectedCategories([]);
      setStarRating(3);
    }
  }, [prospect, open]);

  const { toast } = useToast();

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const queryClient = useQueryClient();

  const handleSaveProspect = async () => {
    try {
      if (!formData.name) {
        toast({
          title: "Missing Information",
          description: "Please enter a name for the prospect.",
          variant: "destructive",
        });
        return;
      }

      setIsSaving(true);

      const agencyId = await scoutingService.getUserAgencyId();
      if (!agencyId) {
        toast({
          title: "Error",
          description:
            "Could not identify your agency. Please try logging in again.",
          variant: "destructive",
        });
        return;
      }

      if (!prospect) {
        // Check for duplicates only when adding new
        const existing = await scoutingService.checkDuplicate(
          agencyId,
          formData.email || undefined,
          formData.instagram || undefined,
        );

        if (existing) {
          toast({
            title: "Prospect Already Exists",
            description: `This prospect (${existing.full_name}) is already in your pipeline.`,
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }

        await scoutingService.createProspect({
          agency_id: agencyId,
          full_name: formData.name,
          email: formData.email,
          phone: formData.phone,
          instagram_handle: formData.instagram,
          categories: selectedCategories,
          rating: starRating,
          source: formData.source as any,
          discovery_date: formData.discoveryDate,
          discovery_location: formData.discoveryLocation,
          referred_by: formData.referredBy,
          status: formData.status as any,
          assigned_agent_name: formData.assignedAgent,
          notes: formData.notes,
          instagram_followers: formData.instagramFollowers,
          engagement_rate: formData.engagementRate,
        });

        toast({
          title: "Prospect Added",
          description: `${formData.name} has been added to your pipeline.`,
        });
      } else {
        // Update existing prospect
        await scoutingService.updateProspect(prospect.id, {
          full_name: formData.name,
          email: formData.email,
          phone: formData.phone,
          instagram_handle: formData.instagram,
          categories: selectedCategories,
          rating: starRating,
          source: formData.source as any,
          discovery_date: formData.discoveryDate,
          discovery_location: formData.discoveryLocation,
          referred_by: formData.referredBy,
          status: formData.status as any,
          assigned_agent_name: formData.assignedAgent,
          notes: formData.notes,
          instagram_followers: formData.instagramFollowers,
          engagement_rate: formData.engagementRate,
        });

        toast({
          title: "Prospect Updated",
          description: `${formData.name}'s information has been updated.`,
        });
      }

      // Invalidate the prospects query to trigger a refetch
      await queryClient.invalidateQueries({
        queryKey: ["prospects", user?.id],
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving prospect:", error);
      toast({
        title: "Error",
        description: "Failed to save prospect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {prospect ? "Edit Prospect" : "Add New Prospect"}
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
                <Input
                  id="name"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram Handle</Label>
                <Input
                  id="instagram"
                  placeholder="@username"
                  value={formData.instagram}
                  onChange={(e) =>
                    handleInputChange("instagram", e.target.value)
                  }
                />
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
                  variant={
                    selectedCategories.includes(cat) ? "default" : "secondary"
                  }
                  onClick={() => toggleCategory(cat)}
                  className={`${
                    selectedCategories.includes(cat)
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  } font-medium`}
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
                <Select
                  value={formData.source}
                  onValueChange={(val) => handleInputChange("source", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="street">Street Scouting</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discovery Date</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.discoveryDate}
                    onChange={(e) =>
                      handleInputChange("discoveryDate", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2 relative">
                <Label>Discovery Location</Label>
                <div className="relative">
                  <Input
                    placeholder="New York, NY"
                    value={formData.discoveryLocation}
                    onChange={(e) => handleLocationSearch(e.target.value)}
                    onFocus={() =>
                      formData.discoveryLocation.length >= 3 &&
                      setShowSuggestions(true)
                    }
                    onBlur={() =>
                      setTimeout(() => setShowSuggestions(false), 200)
                    }
                  />
                  {isSearchingLocation && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                    </div>
                  )}
                </div>
                {showSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {locationSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-0"
                        onClick={() => {
                          handleInputChange(
                            "discoveryLocation",
                            suggestion.name,
                          );
                          setShowSuggestions(false);
                        }}
                      >
                        {suggestion.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Referred By</Label>
                <Input
                  placeholder="Name of referrer"
                  value={formData.referredBy}
                  onChange={(e) =>
                    handleInputChange("referredBy", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2">Star Rating</h3>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-8 h-8 cursor-pointer ${i <= starRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                  onClick={() => setStarRating(i)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Internal Notes</Label>
            <Textarea
              placeholder="Add notes about this prospect..."
              className="h-32"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 mb-4">
              Social Media (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Instagram Followers</Label>
                <Input
                  type="number"
                  value={formData.instagramFollowers || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "instagramFollowers",
                      e.target.value === "" ? 0 : parseFloat(e.target.value),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Engagement Rate (%)</Label>
                <Input
                  type="number"
                  value={formData.engagementRate || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "engagementRate",
                      e.target.value === "" ? 0 : parseFloat(e.target.value),
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
              onClick={handleSaveProspect}
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </div>
              ) : prospect ? (
                "Update Prospect"
              ) : (
                "Add Prospect"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// --- Mock Data (Based on Reference) ---

interface Client {
  id: string;
  name: string;
  status: "Active Client" | "Prospect" | "Lead" | "Inactive";
  industry: string;
  website: string;
  contacts: number;
  totalRevenue: string;
  bookings: number;
  lastBooking: string;
  nextFollowUp: string;
  tags: string[];
  notes?: string;
  preferences?: {
    talentTypes: string[];
    budgetRange: string;
    leadTime: string;
  };
  metrics?: {
    revenue: string;
    bookings: number;
    packagesSent: number;
    lastBookingDate: string;
  };
}

interface FileItem {
  id: string;
  name: string;
  type: "pdf" | "docx" | "jpg" | "png";
  size: string;
  folder: string;
  uploadedBy: string;
  uploadedAt: string;
  thumbnailUrl?: string;
}

interface FolderItem {
  id: string;
  name: string;
  fileCount: number;
  totalSize: string;
  type: string;
}

const MOCK_FOLDERS: FolderItem[] = [
  {
    id: "1",
    name: "Talent Files",
    fileCount: 124,
    totalSize: "4.2 GB",
    type: "talent",
  },
  {
    id: "2",
    name: "Client Contracts",
    fileCount: 45,
    totalSize: "1.8 GB",
    type: "client",
  },
  {
    id: "3",
    name: "Booking Documents",
    fileCount: 89,
    totalSize: "3.1 GB",
    type: "booking",
  },
  {
    id: "4",
    name: "Receipts & Expenses",
    fileCount: 156,
    totalSize: "2.1 GB",
    type: "expense",
  },
  {
    id: "5",
    name: "Marketing Materials",
    fileCount: 67,
    totalSize: "1.2 GB",
    type: "marketing",
  },
];

const MOCK_FILES: FileItem[] = [
  {
    id: "1",
    name: "Emma_Contract_2024.pdf",
    type: "pdf",
    size: "245 KB",
    folder: "Talent Files",
    uploadedBy: "John Doe",
    uploadedAt: "Jan 10, 2024",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop",
  },
  {
    id: "2",
    name: "Vogue_Shoot_Callsheet.pdf",
    type: "pdf",
    size: "186 KB",
    folder: "Booking Documents",
    uploadedBy: "Jane Smith",
    uploadedAt: "Jan 9, 2024",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&h=300&fit=crop",
  },
  {
    id: "3",
    name: "Milan_Headshot_2024.jpg",
    type: "jpg",
    size: "3.2 MB",
    folder: "Talent Files",
    uploadedBy: "John Doe",
    uploadedAt: "Jan 8, 2024",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=300&fit=crop",
  },
  {
    id: "4",
    name: "Client_Brief_Nike.docx",
    type: "docx",
    size: "124 KB",
    folder: "Client Contracts",
    uploadedBy: "Sarah Wilson",
    uploadedAt: "Jan 7, 2024",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop",
  },
];

const MOCK_CLIENTS: Client[] = [
  {
    id: "nike",
    name: "Nike Global",
    status: "Active Client",
    industry: "Athletic Apparel",
    website: "nike.com",
    contacts: 3,
    totalRevenue: "$450K",
    bookings: 12,
    lastBooking: "Dec 15, 2025",
    nextFollowUp: "Jan 20, 2026",
    tags: ["Fashion", "Sports", "High-Budget"],
    preferences: {
      talentTypes: ["Athletic", "Fitness", "Lifestyle"],
      budgetRange: "$50,000 - $250,000",
      leadTime: "3-4 weeks",
    },
    metrics: {
      revenue: "$450K",
      bookings: 12,
      packagesSent: 8,
      lastBookingDate: "Dec 15",
    },
  },
  {
    id: "vogue",
    name: "Vogue Magazine",
    status: "Prospect",
    industry: "Fashion Publishing",
    website: "vogue.com",
    contacts: 2,
    totalRevenue: "$45K",
    bookings: 3,
    lastBooking: "Nov 20, 2025",
    nextFollowUp: "Jan 15, 2026",
    tags: ["Editorial", "Fashion", "Print"],
  },
  {
    id: "apple",
    name: "Apple Inc.",
    status: "Lead",
    industry: "Technology",
    website: "apple.com",
    contacts: 1,
    totalRevenue: "$0K",
    bookings: 0,
    lastBooking: "Never",
    nextFollowUp: "Jan 18, 2026",
    tags: ["Tech", "Commercial", "Premium"],
  },
];

const MOCK_CONTACTS = [
  {
    name: "Sarah Chen",
    role: "Casting Director",
    email: "sarah.chen@nike.com",
    phone: "+1 (503) 555-0101",
  },
  {
    name: "Mike Johnson",
    role: "Creative Director",
    email: "mike.j@nike.com",
    phone: "+1 (503) 555-0102",
  },
  {
    name: "Lisa Park",
    role: "Finance",
    email: "lisa.park@nike.com",
    phone: "+1 (503) 555-0103",
  },
];

const MOCK_COMMUNICATIONS = [
  {
    subject: "Spring Campaign Talent Options",
    date: "January 5, 2026",
    type: "email",
    participants: "Agency",
  },
  {
    subject: "Follow-up on December shoot",
    date: "December 20, 2025",
    type: "call",
    participants: "Client",
  },
  {
    subject: "Q1 2026 Planning Meeting",
    date: "December 10, 2025",
    type: "meeting",
    participants: "Both",
  },
];

// --- Accounting Mock Data ---
const MOCK_TALENT_EARNINGS = [
  {
    id: "1",
    name: "Emma",
    photo:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    totalOwed: "$0",
    totalPaidYTD: "$2.4k",
    lastPayment: "No payments",
    totalJobs: 3,
  },
  {
    id: "2",
    name: "Sergine",
    photo:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop",
    totalOwed: "$0",
    totalPaidYTD: "$0",
    lastPayment: "No payments",
    totalJobs: 0,
  },
  {
    id: "3",
    name: "Milan",
    photo:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    totalOwed: "$0",
    totalPaidYTD: "$0",
    lastPayment: "No payments",
    totalJobs: 0,
  },
  {
    id: "4",
    name: "Julia",
    photo:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    totalOwed: "$0",
    totalPaidYTD: "$0",
    lastPayment: "No payments",
    totalJobs: 0,
  },
];

const MOCK_EXPENSES = [
  {
    id: "1",
    name: "Client meeting - Uber",
    category: "Travel",
    date: "Jan 10, 2026",
    submitter: "Emma",
    status: "approved",
    amount: "$45",
  },
  {
    id: "2",
    name: "Camera rental",
    category: "Equipment",
    date: "Jan 8, 2026",
    submitter: "Milan",
    status: "pending",
    amount: "$320",
  },
  {
    id: "3",
    name: "Instagram ads",
    category: "Marketing",
    date: "Jan 5, 2026",
    status: "approved",
    submitter: "",
    amount: "$250",
  },
  {
    id: "4",
    name: "Flight to LA casting",
    category: "Travel",
    date: "Jan 3, 2026",
    submitter: "Carla",
    status: "approved",
    amount: "$480",
  },
];

const MOCK_PAYMENTS = [
  {
    id: "1",
    invoiceNumber: "#2026-1000",
    client: "WRE-5678",
    amount: "$3",
    date: "Jan 27, 2026",
  },
];

const MOCK_INVOICES = [
  {
    id: "1",
    invoiceNumber: "2026-1000",
    clientName: "Emma",
    issueDate: "Jan 12, 2026",
    dueDate: "Feb 11, 2026",
    amount: "$3",
    status: "draft",
  },
];

const StorageUsageCard = () => (
  <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        <HardDrive className="w-5 h-5 text-indigo-600" />
        <span className="text-base font-bold text-gray-900">Storage Usage</span>
      </div>
      <span className="text-sm font-bold text-gray-900">
        <span className="text-indigo-600">12.4 GB</span> of 50 GB used
      </span>
    </div>
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
      <div
        className="h-full bg-indigo-600 rounded-full"
        style={{ width: "24.8%" }}
      />
    </div>
    <div className="flex justify-between items-center">
      <p className="text-sm text-gray-500 font-medium">
        37.6 GB remaining • Professional Plan
      </p>
      <Button variant="link" className="text-indigo-600 font-bold p-0 h-auto">
        Upgrade Plan
      </Button>
    </div>
  </Card>
);

const FolderCard = ({ folder }: { folder: FolderItem }) => {
  const getFolderColor = (type: string) => {
    switch (type) {
      case "talent":
        return "text-indigo-500";
      case "client":
        return "text-emerald-500";
      case "booking":
        return "text-blue-500";
      case "expense":
        return "text-orange-500";
      case "marketing":
        return "text-purple-500";
      default:
        return "text-gray-500";
    }
  };

  const getFolderBg = (type: string) => {
    switch (type) {
      case "talent":
        return "bg-indigo-50/50";
      case "client":
        return "bg-emerald-50/50";
      case "booking":
        return "bg-blue-50/50";
      case "expense":
        return "bg-orange-50/50";
      case "marketing":
        return "bg-purple-50/50";
      default:
        return "bg-gray-50/50";
    }
  };

  return (
    <Card className="p-6 bg-white border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div
          className={`w-14 h-14 ${getFolderBg(folder.type)} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm border border-white/50`}
        >
          <div className="relative">
            <Folder
              className={`w-8 h-8 ${getFolderColor(folder.type)} fill-current opacity-20`}
            />
            <Folder
              className={`absolute inset-0 w-8 h-8 ${getFolderColor(folder.type)}`}
            />
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl">
            <DropdownMenuItem className="font-bold text-gray-700 cursor-pointer">
              <FolderOpen className="w-4 h-4 mr-2" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem className="font-bold text-gray-700 cursor-pointer">
              <Edit className="w-4 h-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="font-bold text-red-600 cursor-pointer">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative z-10">
        <h4 className="text-base font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
          {folder.name}
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 font-bold">
            {folder.fileCount} files
          </span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500 font-bold">
            {folder.totalSize}
          </span>
        </div>
      </div>
    </Card>
  );
};

const FileCard = ({
  file,
  onPreview,
  onShare,
}: {
  file: FileItem;
  onPreview: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
}) => (
  <Card className="overflow-hidden bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-shadow group max-w-[280px]">
    <div className="aspect-video bg-gray-50 flex items-center justify-center relative">
      {file.thumbnailUrl ? (
        <img
          src={file.thumbnailUrl}
          alt={file.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          {file.type === "pdf" && <FileText className="w-8 h-8 text-red-500" />}
          {file.type === "docx" && (
            <FileText className="w-8 h-8 text-blue-500" />
          )}
          {file.type === "jpg" && <File className="w-8 h-8 text-emerald-500" />}
          <span className="text-[10px] font-black uppercase text-gray-400">
            {file.type}
          </span>
        </div>
      )}
      <div className="absolute top-2 right-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl">
            <DropdownMenuItem
              onClick={() => onPreview(file)}
              className="font-bold text-gray-700 cursor-pointer"
            >
              <Eye className="w-4 h-4 mr-2" /> Preview
            </DropdownMenuItem>
            <DropdownMenuItem className="font-bold text-gray-700 cursor-pointer">
              <Download className="w-4 h-4 mr-2" /> Download
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onShare(file)}
              className="font-bold text-gray-700 cursor-pointer"
            >
              <Share2 className="w-4 h-4 mr-2" /> Share Link
            </DropdownMenuItem>
            <DropdownMenuItem className="font-bold text-red-600 cursor-pointer">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    <div className="p-2.5">
      <h5 className="text-[13px] font-bold text-gray-900 truncate mb-1">
        {file.name}
      </h5>
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-600 font-bold">
            {file.size}
          </span>
          <span className="text-[10px] text-gray-500 font-bold">
            {file.uploadedAt}
          </span>
        </div>
        <Badge
          variant="outline"
          className="text-[9px] font-bold text-gray-700 border-gray-200 px-1.5 py-0 bg-gray-50/50"
        >
          {file.folder}
        </Badge>
      </div>
    </div>
  </Card>
);

const FileRow = ({
  file,
  onPreview,
  onShare,
}: {
  file: FileItem;
  onPreview: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
}) => (
  <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-sm transition-shadow group">
    <div className="flex items-center gap-4 flex-1">
      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
        {file.type === "pdf" && <FileText className="w-5 h-5 text-red-500" />}
        {file.type === "docx" && <FileText className="w-5 h-5 text-blue-500" />}
        {file.type === "jpg" && <File className="w-5 h-5 text-emerald-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <h5 className="text-sm font-bold text-gray-900 truncate">
          {file.name}
        </h5>
        <p className="text-xs text-gray-600 font-bold">
          {file.size} • <span className="text-indigo-600">{file.folder}</span> •
          Uploaded by <span className="text-gray-900">{file.uploadedBy}</span>{" "}
          on {file.uploadedAt}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        size="icon"
        variant="ghost"
        className="w-8 h-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
        onClick={() => onPreview(file)}
      >
        <Eye className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
      >
        <Download className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
        onClick={() => onShare(file)}
      >
        <Share2 className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

const NewFolderModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[425px] rounded-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-gray-900">
          Create New Folder
        </DialogTitle>
        <DialogDescription className="text-gray-500 font-medium">
          Organize your files into folders
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label className="text-sm font-bold text-gray-700">Folder Name</Label>
          <Input
            placeholder="e.g., Q1 2024 Campaigns"
            className="h-11 rounded-xl border-gray-200"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-bold text-gray-700">Folder Type</Label>
          <Select>
            <SelectTrigger className="h-11 rounded-xl border-gray-200">
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="talent">Talent Files</SelectItem>
              <SelectItem value="client">Client Files</SelectItem>
              <SelectItem value="booking">Booking Files</SelectItem>
              <SelectItem value="expense">Expense Files</SelectItem>
              <SelectItem value="marketing">Marketing Files</SelectItem>
              <SelectItem value="others">others</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="h-11 px-6 rounded-xl border-gray-200 font-bold"
        >
          Cancel
        </Button>
        <Button className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">
          Create Folder
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const UploadFilesModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[500px] rounded-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-gray-900">
          Upload Files
        </DialogTitle>
        <DialogDescription className="text-gray-500 font-medium">
          Upload documents, images, or other files to your storage
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-6 py-4">
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer group">
          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-sm font-bold text-gray-900 mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500 font-medium">
            PDF, DOC, JPG, PNG up to 50MB
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-bold text-gray-700">
            Save to folder
          </Label>
          <Select>
            <SelectTrigger className="h-11 rounded-xl border-gray-200">
              <SelectValue placeholder="Select a folder..." />
            </SelectTrigger>
            <SelectContent>
              {MOCK_FOLDERS.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="h-11 px-6 rounded-xl border-gray-200 font-bold"
        >
          Cancel
        </Button>
        <Button className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">
          Upload Files
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const FilePreviewModal = ({
  file,
  isOpen,
  onClose,
}: {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!file) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
              {file.type === "pdf" && (
                <FileText className="w-6 h-6 text-red-500" />
              )}
              {file.type === "docx" && (
                <FileText className="w-6 h-6 text-blue-500" />
              )}
              {file.type === "jpg" && (
                <File className="w-6 h-6 text-emerald-500" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                {file.name}
              </DialogTitle>
              <p className="text-sm text-gray-500 font-medium">
                {file.size} • Uploaded by {file.uploadedBy} on {file.uploadedAt}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl hover:bg-gray-50"
          >
            <X className="w-5 h-5 text-gray-400" />
          </Button>
        </div>
        <div className="p-10 bg-gray-50/50 flex items-center justify-center min-h-[500px] relative group">
          {file.thumbnailUrl ? (
            <div className="relative">
              <img
                src={file.thumbnailUrl}
                alt={file.name}
                className="max-w-full max-h-[600px] rounded-2xl shadow-2xl border-4 border-white transition-transform group-hover:scale-[1.01]"
              />
              <div className="absolute inset-0 rounded-2xl shadow-inner pointer-events-none" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 p-12 bg-white rounded-3xl shadow-sm border border-gray-100">
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center">
                {file.type === "pdf" && (
                  <FileText className="w-10 h-10 text-red-500" />
                )}
                {file.type === "docx" && (
                  <FileText className="w-10 h-10 text-blue-500" />
                )}
              </div>
              <div className="text-center">
                <p className="text-gray-900 font-bold text-lg mb-1">
                  Preview not available
                </p>
                <p className="text-gray-500 text-sm font-medium">
                  Please download the file to view its content
                </p>
              </div>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-8">
                Download Now
              </Button>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-white">
          <div className="flex gap-2">
            <Badge
              variant="outline"
              className="bg-gray-50 text-gray-600 border-gray-200 font-bold px-3 py-1 rounded-lg"
            >
              {file.folder}
            </Badge>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-11 px-6 rounded-xl border-gray-200 font-bold text-gray-700 hover:bg-gray-50"
            >
              Close Preview
            </Button>
            <Button className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200">
              <Download className="w-4 h-4" />
              Download File
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ShareFileModal = ({
  file,
  isOpen,
  onClose,
}: {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!file) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-6 border-b border-gray-100 bg-white">
          <div className="flex justify-between items-start mb-1">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Share File
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-xl -mr-2 -mt-2"
            >
              <X className="w-5 h-5 text-gray-400" />
            </Button>
          </div>
          <DialogDescription className="text-gray-500 font-medium">
            Generate a secure shareable link for{" "}
            <span className="text-gray-900 font-bold">{file.name}</span>
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6 bg-gray-50/30">
          <div className="space-y-2.5">
            <Label className="text-sm font-bold text-gray-700 ml-1">
              Share Link
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  readOnly
                  value={`https://agency.likelee.ai/share/${file.id}`}
                  className="h-12 rounded-xl border-gray-200 bg-white font-medium pl-4 pr-10 shadow-sm focus:ring-2 focus:ring-indigo-500/20"
                />
                <LinkIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              <Button className="h-12 px-5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 shadow-sm flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Copy
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-gray-700 ml-1">
                Link Expiration
              </Label>
              <Select defaultValue="7-days">
                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white shadow-sm">
                  <SelectValue placeholder="Select expiration..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="24-hours" className="font-medium">
                    24 Hours
                  </SelectItem>
                  <SelectItem value="7-days" className="font-medium">
                    7 Days
                  </SelectItem>
                  <SelectItem value="30-days" className="font-medium">
                    30 Days
                  </SelectItem>
                  <SelectItem value="never" className="font-medium">
                    Never
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-gray-700 ml-1">
                Access Level
              </Label>
              <Select defaultValue="view">
                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white shadow-sm">
                  <SelectValue placeholder="Select access..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="view" className="font-medium">
                    View Only
                  </SelectItem>
                  <SelectItem value="download" className="font-medium">
                    Can Download
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <Label
                  className="text-sm font-bold text-gray-700 cursor-pointer"
                  htmlFor="require-password"
                >
                  Require password
                </Label>
                <p className="text-[11px] text-gray-500 font-medium">
                  Add an extra layer of security
                </p>
              </div>
            </div>
            <Checkbox
              id="require-password"
              className="rounded-md w-5 h-5 border-gray-300"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-12 px-6 rounded-xl border-gray-200 font-bold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200">
            <Share2 className="w-4 h-4" />
            Create Share Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// --- Accounting & Invoicing Views ---

const ExpenseTrackingView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [expenseRows, setExpenseRows] = useState<any[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseCategory, setNewExpenseCategory] = useState("Travel");
  const [newExpenseDate, setNewExpenseDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [newExpenseAmount, setNewExpenseAmount] = useState("0");
  const [newExpenseStatus, setNewExpenseStatus] = useState("approved");
  const [newExpenseSubmitter, setNewExpenseSubmitter] = useState("");

  const asArray = (v: any) => {
    if (Array.isArray(v)) return v;
    if (Array.isArray(v?.data)) return v.data;
    if (Array.isArray(v?.items)) return v.items;
    if (Array.isArray(v?.rows)) return v.rows;
    return [] as any[];
  };

  const money = (cents: number, currency: string) => {
    const n = Math.round(Number(cents || 0)) / 100;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: String(currency || "USD").toUpperCase(),
      }).format(n);
    } catch {
      return `${String(currency || "USD").toUpperCase()} ${n.toFixed(2)}`;
    }
  };

  const formatDate = (s: any) => {
    const v = String(s || "");
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const resp = await listExpenses({});
      setExpenseRows(asArray(resp));
    } catch (e: any) {
      toast({
        title: "Failed to load expenses",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-50 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "rejected":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Travel":
        return <Calendar className="w-5 h-5 text-orange-600" />;
      case "Equipment":
        return <Package className="w-5 h-5 text-blue-600" />;
      case "Marketing":
        return <Megaphone className="w-5 h-5 text-purple-600" />;
      default:
        return <Receipt className="w-5 h-5 text-gray-600" />;
    }
  };

  const normalizedExpenses = useMemo(() => {
    return expenseRows.map((ex) => ({
      id: String((ex as any)?.id || ""),
      name: String((ex as any)?.name || ""),
      category: String((ex as any)?.category || "Other"),
      date: formatDate((ex as any)?.expense_date),
      status: String((ex as any)?.status || "approved"),
      submitter: String((ex as any)?.submitter || ""),
      amountCents: Number((ex as any)?.amount_cents || 0) || 0,
      currency: String((ex as any)?.currency || "USD"),
    }));
  }, [expenseRows]);

  const filteredExpenses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const cat = categoryFilter;
    return normalizedExpenses.filter((ex) => {
      if (q) {
        const hay = `${ex.name} ${ex.category} ${ex.submitter}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (cat !== "all") {
        const want = cat.toLowerCase();
        if (String(ex.category || "").toLowerCase() !== want) return false;
      }
      return true;
    });
  }, [normalizedExpenses, searchTerm, categoryFilter]);

  const totalExpensesByCurrency = useMemo(() => {
    const m = new Map<string, number>();
    for (const ex of filteredExpenses) {
      m.set(ex.currency, (m.get(ex.currency) || 0) + (ex.amountCents || 0));
    }
    return m;
  }, [filteredExpenses]);

  const totalExpensesText = useMemo(() => {
    const entries = Array.from(totalExpensesByCurrency.entries()).filter(
      ([, v]) => (v || 0) !== 0,
    );
    if (!entries.length) return money(0, "USD");
    if (entries.length === 1) {
      const [cur, cents] = entries[0];
      return money(cents, cur);
    }
    return entries
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cur, cents]) => money(cents, cur))
      .join(" + ");
  }, [money, totalExpensesByCurrency]);

  const submitNewExpense = async () => {
    const dollars =
      Number(String(newExpenseAmount || "0").replace(/[^0-9.\-]/g, "")) || 0;
    const cents = Math.round(dollars * 100);
    try {
      await createExpense({
        name: newExpenseName,
        category: newExpenseCategory,
        expense_date: newExpenseDate,
        amount_cents: cents,
        currency: "USD",
        status: newExpenseStatus,
        submitter: newExpenseSubmitter || undefined,
      });
      setShowAddExpense(false);
      setNewExpenseName("");
      setNewExpenseAmount("0");
      setNewExpenseSubmitter("");
      await loadExpenses();
      toast({ title: "Expense added" });
    } catch (e: any) {
      toast({
        title: "Failed to add expense",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Expense Tracking</h2>
          <p className="text-gray-600 font-medium">
            Track and manage agency expenses
          </p>
        </div>
        <Button
          onClick={() => setShowAddExpense(true)}
          className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Expense
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search expenses..."
            className="pl-12 h-12 bg-white border-gray-100 rounded-xl text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-64 h-12 bg-white border-gray-100 rounded-xl">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="travel">Travel</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-gray-600 font-medium">Loading…</div>
        ) : (
          filteredExpenses.map((expense) => (
            <Card
              key={expense.id}
              className="p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-100">
                    {getCategoryIcon(expense.category)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-gray-900">
                      {expense.name}
                    </h4>
                    <p className="text-sm text-gray-600 font-bold">
                      {expense.category} • {expense.date}
                      {expense.submitter && ` • ${expense.submitter}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold px-3 py-1 rounded-lg capitalize ${getStatusColor(expense.status)}`}
                  >
                    {expense.status}
                  </Badge>
                  <span className="text-lg font-bold text-gray-900">
                    {money(expense.amountCents, expense.currency)}
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 rounded-2xl">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-gray-700 mb-1">
              Total Expenses
            </p>
            <p className="text-3xl font-bold text-orange-600">
              {totalExpensesText}
            </p>
          </div>
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
            <Receipt className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </Card>

      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Add Expense
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-medium">
              Create a new operating expense for your agency.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">Name</Label>
              <Input
                value={newExpenseName}
                onChange={(e) => setNewExpenseName(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="e.g. Camera rental"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">
                  Category
                </Label>
                <Select
                  value={newExpenseCategory}
                  onValueChange={setNewExpenseCategory}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Travel">Travel</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">Date</Label>
                <Input
                  type="date"
                  value={newExpenseDate}
                  onChange={(e) => setNewExpenseDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">
                  Amount (USD)
                </Label>
                <Input
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  className="h-11 rounded-xl"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">
                  Status
                </Label>
                <Select
                  value={newExpenseStatus}
                  onValueChange={setNewExpenseStatus}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="approved">approved</SelectItem>
                    <SelectItem value="pending">pending</SelectItem>
                    <SelectItem value="rejected">rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">
                Submitter (optional)
              </Label>
              <Input
                value={newExpenseSubmitter}
                onChange={(e) => setNewExpenseSubmitter(e.target.value)}
                className="h-11 rounded-xl"
                placeholder="e.g. Emma"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setShowAddExpense(false)}
              className="h-11 rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={submitNewExpense}
              disabled={!newExpenseName.trim() || loading}
              className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TalentStatementsView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("amount-high");
  const [hasUnpaidEarnings, setHasUnpaidEarnings] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<any>(null);

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [talentRows, setTalentRows] = useState<any[]>([]);
  const [statementSummaryRows, setStatementSummaryRows] = useState<any[]>([]);
  const [statementLineRows, setStatementLineRows] = useState<any[]>([]);

  const asArray = (v: any) => {
    if (Array.isArray(v)) return v;
    if (Array.isArray(v?.data)) return v.data;
    if (Array.isArray(v?.items)) return v.items;
    if (Array.isArray(v?.rows)) return v.rows;
    return [] as any[];
  };

  const money = (cents: number, currency: string) => {
    const n = Math.round(Number(cents || 0)) / 100;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: String(currency || "USD").toUpperCase(),
      }).format(n);
    } catch {
      return `${String(currency || "USD").toUpperCase()} ${n.toFixed(2)}`;
    }
  };

  const formatDate = (s: any) => {
    const v = String(s || "");
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [talents, statements] = await Promise.all([
          getAgencyTalents({}),
          listTalentStatements({}),
        ]);
        if (!mounted) return;
        setTalentRows(asArray(talents));
        setStatementSummaryRows(asArray((statements as any)?.summaries));
        setStatementLineRows(asArray((statements as any)?.lines));
      } catch (e: any) {
        toast({
          title: "Failed to load talent statements",
          description: String(e?.message || e),
          variant: "destructive" as any,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const talentById = useMemo(() => {
    const m = new Map<string, any>();
    for (const t of talentRows) {
      const id = String((t as any)?.id || "");
      if (!id) continue;
      m.set(id, t);
    }
    return m;
  }, [talentRows]);

  const summaries = useMemo(() => {
    // Join backend summaries with talent profile info
    const rows = asArray(statementSummaryRows).map((s: any) => {
      const tid = String(s?.talent_id || "");
      const t = talentById.get(tid);
      const name =
        String(t?.full_name || "").trim() ||
        String(s?.talent_name || "").trim() ||
        "(unknown)";
      const photo = String(t?.profile_photo_url || "");
      return {
        talentId: tid,
        name,
        photo,
        totalJobs: Number(s?.total_jobs || 0) || 0,
        totalOwedCents: Number(s?.total_owed_cents || 0) || 0,
        totalPaidYTDCents: Number(s?.total_paid_ytd_cents || 0) || 0,
        lastPaymentAt: String(s?.last_payment_at || ""),
      };
    });

    const q = searchTerm.trim().toLowerCase();
    let out = rows;
    if (q) out = out.filter((r) => r.name.toLowerCase().includes(q));
    if (hasUnpaidEarnings) out = out.filter((r) => r.totalOwedCents > 0);

    out = out.sort((a, b) => {
      if (sortBy === "amount-high") return b.totalOwedCents - a.totalOwedCents;
      if (sortBy === "amount-low") return a.totalOwedCents - b.totalOwedCents;
      if (sortBy === "total-paid")
        return b.totalPaidYTDCents - a.totalPaidYTDCents;
      if (sortBy === "name-az") return a.name.localeCompare(b.name);
      if (sortBy === "name-za") return b.name.localeCompare(a.name);
      return 0;
    });
    return out;
  }, [statementSummaryRows, talentById, searchTerm, hasUnpaidEarnings, sortBy]);

  const selectedLines = useMemo(() => {
    if (!selectedTalent) return [] as any[];
    const tid = String(selectedTalent?.talentId || selectedTalent?.id || "");
    return asArray(statementLineRows)
      .filter((l: any) => String(l?.talent_id || "") === tid)
      .map((l: any) => ({
        jobDate: String(l?.invoice_date || ""),
        client: String(l?.client_name || ""),
        description: String(l?.description || ""),
        grossCents: Number(l?.gross_cents || 0) || 0,
        agencyFeeCents: Number(l?.agency_fee_cents || 0) || 0,
        netCents: Number(l?.net_cents || 0) || 0,
        status: String(l?.status || ""),
        invoiceNumber: String(l?.invoice_number || ""),
        paidAt: String(l?.paid_at || ""),
      }));
  }, [selectedTalent, statementLineRows]);

  const exportAll = () => {
    const esc = (v: any) => {
      const s = String(v ?? "");
      const needs = /[",\n\r]/.test(s);
      const out = s.replace(/"/g, '""');
      return needs ? `"${out}"` : out;
    };

    const allLines = asArray(statementLineRows);
    if (!allLines.length) {
      toast({
        title: "Nothing to export",
        description: "No statement rows are available yet.",
        variant: "destructive" as any,
      });
      return;
    }

    const header = [
      "talent_id",
      "talent_name",
      "invoice_number",
      "invoice_date",
      "client_name",
      "description",
      "gross_cents",
      "agency_fee_cents",
      "net_cents",
      "status",
      "paid_at",
    ];

    const rows = allLines.map((l: any) => [
      esc(l?.talent_id),
      esc(l?.talent_name),
      esc(l?.invoice_number),
      esc(l?.invoice_date),
      esc(l?.client_name),
      esc(l?.description),
      esc(l?.gross_cents),
      esc(l?.agency_fee_cents),
      esc(l?.net_cents),
      esc(l?.status),
      esc(l?.paid_at),
    ]);

    const csv = [header.join(","), ...rows.map((r: any[]) => r.join(","))].join(
      "\n",
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `talent-statements-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (selectedTalent) {
    const totalGrossCents = selectedLines.reduce(
      (sum, l) => sum + (l.grossCents || 0),
      0,
    );
    const totalAgencyFeeCents = selectedLines.reduce(
      (sum, l) => sum + (l.agencyFeeCents || 0),
      0,
    );
    const totalNetCents = selectedLines.reduce(
      (sum, l) => sum + (l.netCents || 0),
      0,
    );
    const unpaidCount = selectedLines.filter(
      (l) => String(l.status) === "sent",
    ).length;
    const paidCount = selectedLines.filter(
      (l) => String(l.status) === "paid",
    ).length;
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setSelectedTalent(null)}
              className="h-10 px-4 rounded-xl border-gray-200 font-bold flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Talent
            </Button>
            <h2 className="text-2xl font-bold text-gray-900">
              Talent Statement - {selectedTalent.name}
            </h2>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-10 px-4 rounded-xl border-gray-200 font-bold flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Email Statement
            </Button>
            <Button
              variant="outline"
              className="h-10 px-4 rounded-xl border-gray-200 font-bold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              className="h-10 px-4 rounded-xl border-gray-200 font-bold flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>
        </div>

        <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
          <div className="flex items-center gap-6">
            <img
              src={selectedTalent.photo}
              alt={selectedTalent.name}
              className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md"
            />
            <div className="space-y-3">
              <h3 className="text-3xl font-bold text-gray-900">
                {selectedTalent.name}
              </h3>
              <Select defaultValue="all-time">
                <SelectTrigger className="w-48 h-10 rounded-xl border-gray-200 font-bold text-gray-700">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all-time">All Time</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="this-quarter">This Quarter</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-4 gap-6">
          <Card className="p-6 bg-orange-50 border border-orange-100 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-orange-600" />
              <p className="text-sm font-bold text-gray-700">Total Owed</p>
            </div>
            <p className="text-3xl font-bold text-orange-600 mb-1">
              {money(Number(selectedTalent.totalOwedCents || 0) || 0, "USD")}
            </p>
            <p className="text-xs text-gray-600 font-medium">
              {unpaidCount} unpaid jobs
            </p>
          </Card>
          <Card className="p-6 bg-green-50 border border-green-100 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-sm font-bold text-gray-700">
                Total Paid (YTD)
              </p>
            </div>
            <p className="text-3xl font-bold text-green-600 mb-1">
              {money(Number(selectedTalent.totalPaidYTDCents || 0) || 0, "USD")}
            </p>
            <p className="text-xs text-gray-600 font-medium">
              {paidCount} paid jobs
            </p>
          </Card>
          <Card className="p-6 bg-purple-50 border border-purple-100 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <p className="text-sm font-bold text-gray-700">
                Lifetime Earnings
              </p>
            </div>
            <p className="text-3xl font-bold text-purple-600 mb-1">$2.4</p>
            <p className="text-xs text-gray-600 font-medium">Avg: $0/mo</p>
          </Card>
          <Card className="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-bold text-gray-700">Last Payment</p>
            </div>
            <p className="text-lg font-bold text-blue-600 mb-1">
              {selectedTalent.lastPaymentAt
                ? formatDate(selectedTalent.lastPaymentAt)
                : "No payments"}
            </p>
          </Card>
        </div>

        <Card className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h4 className="text-lg font-bold text-gray-900">Earnings Detail</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left w-12"></th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Job Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Gross
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Net
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedLines.map((l) => {
                  const isPaid = String(l.status) === "paid";
                  return (
                    <tr
                      key={`${l.invoiceNumber}-${l.description}`}
                      className={isPaid ? "bg-green-50/30" : ""}
                    >
                      <td className="px-6 py-4">
                        {isPaid ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        {l.jobDate ? formatDate(l.jobDate) : ""}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-700">
                        {l.client}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                        {l.description}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        {money(l.grossCents, "USD")}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-red-600">
                        -{money(l.agencyFeeCents, "USD")}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-green-600">
                        {money(l.netCents, "USD")}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            isPaid
                              ? "bg-green-100 text-green-700 border-green-200 font-bold"
                              : "bg-yellow-100 text-yellow-700 border-yellow-200 font-bold"
                          }
                        >
                          {isPaid ? "Paid" : "Unpaid"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-indigo-600">
                        {l.invoiceNumber}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3">
            <div className="flex justify-between items-center max-w-md ml-auto">
              <span className="text-sm text-gray-600 font-bold">
                Total Gross Amount
              </span>
              <span className="text-sm font-bold text-gray-900">
                {money(totalGrossCents, "USD")}
              </span>
            </div>
            <div className="flex justify-between items-center max-w-md ml-auto">
              <span className="text-sm text-gray-600 font-bold">
                Total Agency Commission (20%)
              </span>
              <span className="text-sm font-bold text-red-600">
                -{money(totalAgencyFeeCents, "USD")}
              </span>
            </div>
            <div className="flex justify-between items-center max-w-md ml-auto pt-3 border-t border-gray-200">
              <span className="text-lg font-bold text-gray-900">
                Total Talent Net
              </span>
              <span className="text-lg font-bold text-green-600">
                {money(totalNetCents, "USD")}
              </span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Talent Earnings Statements
          </h2>
          <p className="text-gray-600 font-medium">
            View and manage talent payment statements
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
          onClick={exportAll}
          disabled={loading}
        >
          <Download className="w-5 h-5" />
          Export All
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by talent name..."
            className="pl-10 h-10 bg-white border-gray-200 rounded-xl text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-56 h-10 bg-white border-gray-200 rounded-xl font-bold text-gray-700 text-sm">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="amount-high">
              Amount Owed (High to Low)
            </SelectItem>
            <SelectItem value="amount-low">
              Amount Owed (Low to High)
            </SelectItem>
            <SelectItem value="total-paid">Total Paid (High to Low)</SelectItem>
            <SelectItem value="name-az">Name (A-Z)</SelectItem>
            <SelectItem value="name-za">Name (Z-A)</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 px-3 h-10 bg-white border border-gray-200 rounded-xl">
          <Checkbox
            id="unpaid-earnings"
            checked={hasUnpaidEarnings}
            onCheckedChange={(checked) =>
              setHasUnpaidEarnings(checked as boolean)
            }
            className="rounded-md w-4 h-4 border-gray-300"
          />
          <Label
            htmlFor="unpaid-earnings"
            className="text-sm font-bold text-gray-700 cursor-pointer"
          >
            Has Unpaid Earnings
          </Label>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-gray-600 font-medium">Loading…</div>
        ) : summaries.length ? (
          summaries.map((talent) => (
            <Card
              key={talent.talentId}
              className="p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox className="rounded-md w-4 h-4 border-gray-300" />
                  <img
                    src={
                      talent.photo ||
                      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop"
                    }
                    alt={talent.name}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
                  />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-900">
                      {talent.name}
                    </h4>
                    <p className="text-xs text-gray-600 font-bold">
                      {talent.totalJobs} total jobs
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold mb-0.5 uppercase tracking-wider">
                      Total Owed
                    </p>
                    <p className="text-base font-bold text-orange-600">
                      {money(talent.totalOwedCents, "USD")}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {talent.totalOwedCents > 0 ? "Has unpaid" : "No unpaid"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold mb-0.5 uppercase tracking-wider">
                      Total Paid (YTD)
                    </p>
                    <p className="text-base font-bold text-green-600">
                      {money(talent.totalPaidYTDCents, "USD")}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {talent.totalPaidYTDCents > 0 ? "Has paid" : "No paid"}
                    </p>
                  </div>
                  <div className="text-right min-w-[100px]">
                    <p className="text-[10px] text-gray-500 font-bold mb-0.5 uppercase tracking-wider">
                      Last Payment
                    </p>
                    <p className="text-xs text-gray-600 font-medium">
                      {talent.lastPaymentAt
                        ? formatDate(talent.lastPaymentAt)
                        : "No payments"}
                    </p>
                  </div>
                  <Button
                    onClick={() => setSelectedTalent(talent)}
                    className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    View Statement
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-sm text-gray-600 font-medium">
            No talent statements yet.
          </div>
        )}
      </div>
    </div>
  );
};

const PaymentTrackingView = () => {
  const reminderKey = "likelee.payment_reminders.v1";
  const [reminder3Days, setReminder3Days] = useState(true);
  const [reminderDueDate, setReminderDueDate] = useState(true);
  const [reminder7Days, setReminder7Days] = useState(true);

  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [invoiceRows, setInvoiceRows] = useState<any[]>([]);

  const asArray = (v: any) => {
    if (Array.isArray(v)) return v;
    if (Array.isArray(v?.data)) return v.data;
    if (Array.isArray(v?.items)) return v.items;
    if (Array.isArray(v?.rows)) return v.rows;
    return [] as any[];
  };

  const money = (cents: number, currency: string) => {
    const n = Math.round(Number(cents || 0)) / 100;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: String(currency || "USD").toUpperCase(),
      }).format(n);
    } catch {
      return `${String(currency || "USD").toUpperCase()} ${n.toFixed(2)}`;
    }
  };

  const moneyTotals = (totalsByCurrency: Map<string, number>) => {
    const entries = Array.from(totalsByCurrency.entries()).filter(
      ([, v]) => (v || 0) !== 0,
    );
    if (!entries.length) return money(0, "USD");
    if (entries.length === 1) {
      const [cur, cents] = entries[0];
      return money(cents, cur);
    }
    // If invoices are in multiple currencies, show a compact breakdown.
    return entries
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cur, cents]) => money(cents, cur))
      .join(" + ");
  };

  const formatDate = (s: any) => {
    const v = String(s || "");
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(reminderKey);
      if (raw) {
        const v = JSON.parse(raw);
        if (typeof v?.reminder3Days === "boolean")
          setReminder3Days(v.reminder3Days);
        if (typeof v?.reminderDueDate === "boolean")
          setReminderDueDate(v.reminderDueDate);
        if (typeof v?.reminder7Days === "boolean")
          setReminder7Days(v.reminder7Days);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        reminderKey,
        JSON.stringify({ reminder3Days, reminderDueDate, reminder7Days }),
      );
    } catch {
      // ignore
    }
  }, [reminder3Days, reminderDueDate, reminder7Days]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const inv = await listInvoices({});
        if (!mounted) return;
        setInvoiceRows(asArray(inv));
      } catch (e: any) {
        toast({
          title: "Failed to load payments",
          description: String(e?.message || e),
          variant: "destructive" as any,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const normalized = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return invoiceRows.map((inv) => {
      const statusRaw = String(
        (inv as any)?.status ??
          (inv as any)?.invoice_status ??
          (inv as any)?.invoice?.status ??
          "draft",
      );
      const dueDateStr = String((inv as any)?.due_date || "");
      const due = dueDateStr ? new Date(dueDateStr) : null;
      const paidAt = (inv as any)?.paid_at ?? (inv as any)?.paidAt;
      const sentAt = (inv as any)?.sent_at ?? (inv as any)?.sentAt;
      const inferredStatus = (() => {
        if (statusRaw === "void") return "void";
        if (paidAt) return "paid";
        if (sentAt) return "sent";
        return statusRaw;
      })();
      const isOverdue =
        inferredStatus !== "paid" &&
        inferredStatus !== "void" &&
        due &&
        due < today;
      return {
        id: String((inv as any)?.id || ""),
        invoiceNumber: String((inv as any)?.invoice_number || ""),
        currency: String((inv as any)?.currency || "USD"),
        totalCents: Number((inv as any)?.total_cents || 0) || 0,
        status: isOverdue ? "overdue" : inferredStatus,
        dueDate: dueDateStr,
        paidAt: paidAt ? String(paidAt) : "",
        sentAt: sentAt ? String(sentAt) : "",
      };
    });
  }, [invoiceRows]);

  const summary = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    const paidThisMonth = normalized.filter((i) => {
      if (!i.paidAt) return false;
      const d = new Date(i.paidAt);
      return !Number.isNaN(d.getTime()) && d >= monthStart;
    });
    const paidThisMonthTotals = new Map<string, number>();
    for (const i of paidThisMonth) {
      const cur = String(i.currency || "USD");
      paidThisMonthTotals.set(
        cur,
        (paidThisMonthTotals.get(cur) || 0) + (i.totalCents || 0),
      );
    }

    const pending = normalized.filter((i) => i.status === "sent");
    const pendingTotals = new Map<string, number>();
    for (const i of pending) {
      const cur = String(i.currency || "USD");
      pendingTotals.set(
        cur,
        (pendingTotals.get(cur) || 0) + (i.totalCents || 0),
      );
    }

    const overdue = normalized.filter((i) => i.status === "overdue");
    const overdueTotals = new Map<string, number>();
    for (const i of overdue) {
      const cur = String(i.currency || "USD");
      overdueTotals.set(
        cur,
        (overdueTotals.get(cur) || 0) + (i.totalCents || 0),
      );
    }

    // Non-goal for MVP per design.md
    const partialCount = 0;
    const partialCents = 0;

    const recentPayments = normalized
      .filter((i) => i.status === "paid" && i.paidAt)
      .sort(
        (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
      )
      .slice(0, 10);

    return {
      paidThisMonthTotals,
      paidThisMonthCount: paidThisMonth.length,
      pendingTotals,
      pendingCount: pending.length,
      partialCents,
      partialCount,
      overdueTotals,
      overdueCount: overdue.length,
      recentPayments,
    };
  }, [normalized]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payment Tracking</h2>
        <p className="text-gray-600 font-medium">
          Monitor payments and manage reminders
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-green-50 border border-green-100 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">
                Paid This Month
              </p>
              <p className="text-3xl font-bold text-green-600">
                {moneyTotals(summary.paidThisMonthTotals)}
              </p>
              <p className="text-xs text-gray-600 font-medium mt-1">
                {summary.paidThisMonthCount} invoices
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-yellow-50 border border-yellow-100 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">
                Pending Payment
              </p>
              <p className="text-3xl font-bold text-yellow-600">
                {moneyTotals(summary.pendingTotals)}
              </p>
              <p className="text-xs text-gray-600 font-medium mt-1">
                {summary.pendingCount} invoices
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">
                Partial Payments
              </p>
              <p className="text-3xl font-bold text-blue-600">
                {money(summary.partialCents, "USD")}
              </p>
              <p className="text-xs text-gray-600 font-medium mt-1">
                {summary.partialCount} invoices
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <PieChart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-red-50 border border-red-100 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Overdue</p>
              <p className="text-3xl font-bold text-red-600">
                {moneyTotals(summary.overdueTotals)}
              </p>
              <p className="text-xs text-gray-600 font-medium mt-1">
                {summary.overdueCount} invoices
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Recent Payments
        </h3>
        {loading ? (
          <div className="text-sm text-gray-600 font-medium">Loading…</div>
        ) : summary.recentPayments.length ? (
          <div className="space-y-3">
            {summary.recentPayments.map((p: any) => (
              <div
                key={String(p.id || p.invoiceNumber)}
                className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Invoice #{p.invoiceNumber}
                    </p>
                    <p className="text-xs text-gray-600 font-medium">
                      {formatDate(p.paidAt)}
                    </p>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {money(p.totalCents, p.currency)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600 font-medium">
            No payments yet.
          </div>
        )}
      </Card>

      <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Payment Reminder Settings
        </h3>
        <p className="text-xs text-gray-500 font-medium mb-4">
          Reminders are not sent automatically in the current MVP. These toggles
          only save your preferences.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div>
              <p className="text-sm font-bold text-gray-900">
                Auto-send reminder 3 days before due date
              </p>
              <p className="text-xs text-gray-600 font-medium">
                Polite reminder template
              </p>
            </div>
            <Checkbox
              checked={reminder3Days}
              onCheckedChange={(checked) =>
                setReminder3Days(checked as boolean)
              }
              className="rounded-md w-6 h-6 border-gray-300"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div>
              <p className="text-sm font-bold text-gray-900">
                Auto-send reminder on due date
              </p>
              <p className="text-xs text-gray-600 font-medium">
                Payment due today template
              </p>
            </div>
            <Checkbox
              checked={reminderDueDate}
              onCheckedChange={(checked) =>
                setReminderDueDate(checked as boolean)
              }
              className="rounded-md w-6 h-6 border-gray-300"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
            <div>
              <p className="text-sm font-bold text-gray-900">
                Auto-send reminder 7 days after due date
              </p>
              <p className="text-xs text-gray-600 font-medium">
                Firm reminder template
              </p>
            </div>
            <Checkbox
              checked={reminder7Days}
              onCheckedChange={(checked) =>
                setReminder7Days(checked as boolean)
              }
              className="rounded-md w-6 h-6 border-gray-300"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

const FinancialReportsView = () => {
  const [reportPeriod, setReportPeriod] = useState("this-year");
  const [clientFilter, setClientFilter] = useState("all");
  const [talentFilter, setTalentFilter] = useState("all");
  const [activeReportTab, setActiveReportTab] = useState("revenue");

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [invoiceRows, setInvoiceRows] = useState<any[]>([]);
  const [clientRows, setClientRows] = useState<any[]>([]);
  const [talentRows, setTalentRows] = useState<any[]>([]);
  const [statementLineRows, setStatementLineRows] = useState<any[]>([]);
  const [expenseRows, setExpenseRows] = useState<any[]>([]);

  const asArray = (v: any) => {
    if (Array.isArray(v)) return v;
    if (Array.isArray(v?.data)) return v.data;
    if (Array.isArray(v?.items)) return v.items;
    if (Array.isArray(v?.rows)) return v.rows;
    return [] as any[];
  };

  const money = (cents: number, currency: string) => {
    const n = Math.round(Number(cents || 0)) / 100;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: String(currency || "USD").toUpperCase(),
      }).format(n);
    } catch {
      return `${String(currency || "USD").toUpperCase()} ${n.toFixed(2)}`;
    }
  };

  const moneyTotals = (totalsByCurrency: Map<string, number>) => {
    const entries = Array.from(totalsByCurrency.entries()).filter(
      ([, v]) => (v || 0) !== 0,
    );
    if (!entries.length) return money(0, "USD");
    if (entries.length === 1) {
      const [cur, cents] = entries[0];
      return money(cents, cur);
    }
    return entries
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cur, cents]) => money(cents, cur))
      .join(" + ");
  };

  const parseDate = (s: any) => {
    const v = String(s || "");
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const dateBoundsForPeriod = (period: string) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);

    const quarterStartMonth = (m: number) => Math.floor(m / 3) * 3;
    if (period === "this-year") {
      start.setMonth(0, 1);
      return { start, end };
    }
    if (period === "last-year") {
      start.setFullYear(now.getFullYear() - 1, 0, 1);
      end.setFullYear(now.getFullYear() - 1, 11, 31);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (period === "this-month") {
      start.setDate(1);
      return { start, end };
    }
    if (period === "last-month") {
      start.setMonth(now.getMonth() - 1, 1);
      end.setFullYear(start.getFullYear(), start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (period === "this-quarter") {
      const m = quarterStartMonth(now.getMonth());
      start.setMonth(m, 1);
      return { start, end };
    }
    if (period === "last-quarter") {
      const m = quarterStartMonth(now.getMonth()) - 3;
      const base = new Date(now.getFullYear(), m, 1);
      start.setFullYear(base.getFullYear(), base.getMonth(), 1);
      end.setFullYear(base.getFullYear(), base.getMonth() + 3, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    return { start, end };
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [inv, clients, talents, statements, expenses] = await Promise.all(
          [
            listInvoices({}),
            getAgencyClients(),
            getAgencyTalents({}),
            listTalentStatements({}),
            listExpenses({}),
          ],
        );
        if (!mounted) return;
        setInvoiceRows(asArray(inv));
        setClientRows(asArray(clients));
        setTalentRows(asArray(talents));
        setStatementLineRows(asArray((statements as any)?.lines));
        setExpenseRows(asArray(expenses));
      } catch (e: any) {
        toast({
          title: "Failed to load financial reports",
          description: String(e?.message || e),
          variant: "destructive" as any,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clientRows) {
      const id = String((c as any)?.id || "");
      const name = String((c as any)?.company || "");
      if (id) m.set(id, name);
    }
    return m;
  }, [clientRows]);

  const talentNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of talentRows) {
      const id = String((t as any)?.id || "");
      const name = String((t as any)?.full_name || "");
      if (id) m.set(id, name);
    }
    return m;
  }, [talentRows]);

  const normalizedInvoices = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return invoiceRows.map((inv) => {
      const statusRaw = String(
        (inv as any)?.status ??
          (inv as any)?.invoice_status ??
          (inv as any)?.invoice?.status ??
          "draft",
      );
      const dueDateStr = String((inv as any)?.due_date || "");
      const due = dueDateStr ? new Date(dueDateStr) : null;
      const paidAt = (inv as any)?.paid_at ?? (inv as any)?.paidAt;
      const sentAt = (inv as any)?.sent_at ?? (inv as any)?.sentAt;
      const inferredStatus = (() => {
        if (statusRaw === "void") return "void";
        if (paidAt) return "paid";
        if (sentAt) return "sent";
        return statusRaw;
      })();
      const isOverdue =
        inferredStatus !== "paid" &&
        inferredStatus !== "void" &&
        due &&
        due < today;
      return {
        id: String((inv as any)?.id || ""),
        invoiceNumber: String((inv as any)?.invoice_number || ""),
        clientId: String((inv as any)?.client_id || ""),
        clientName:
          clientNameById.get(String((inv as any)?.client_id || "")) ||
          String((inv as any)?.bill_to_company || ""),
        invoiceDate: String((inv as any)?.invoice_date || ""),
        dueDate: dueDateStr,
        currency: String((inv as any)?.currency || "USD"),
        subtotalCents: Number((inv as any)?.subtotal_cents || 0) || 0,
        taxCents: Number((inv as any)?.tax_cents || 0) || 0,
        totalCents: Number((inv as any)?.total_cents || 0) || 0,
        agencyFeeCents: Number((inv as any)?.agency_fee_cents || 0) || 0,
        talentNetCents: Number((inv as any)?.talent_net_cents || 0) || 0,
        status: isOverdue ? "overdue" : inferredStatus,
      };
    });
  }, [clientNameById, invoiceRows]);

  const filteredInvoices = useMemo(() => {
    const { start, end } = dateBoundsForPeriod(reportPeriod);
    return normalizedInvoices.filter((inv) => {
      const d = parseDate(inv.invoiceDate);
      if (!d) return false;
      if (d < start || d > end) return false;
      if (clientFilter !== "all" && inv.clientId !== clientFilter) return false;
      return true;
    });
  }, [normalizedInvoices, reportPeriod, clientFilter]);

  const filteredStatementLines = useMemo(() => {
    const { start, end } = dateBoundsForPeriod(reportPeriod);
    return asArray(statementLineRows).filter((l: any) => {
      const d = parseDate(l?.invoice_date);
      if (!d) return false;
      if (d < start || d > end) return false;
      if (talentFilter !== "all" && String(l?.talent_id || "") !== talentFilter)
        return false;
      return true;
    });
  }, [statementLineRows, reportPeriod, talentFilter]);

  const summary = useMemo(() => {
    const paid = filteredInvoices.filter((i) => i.status === "paid");
    const pending = filteredInvoices.filter((i) => i.status === "sent");
    const overdue = filteredInvoices.filter((i) => i.status === "overdue");

    const revenueTotals = new Map<string, number>();
    const pendingTotals = new Map<string, number>();
    const receivablesTotals = new Map<string, number>();
    for (const i of paid) {
      revenueTotals.set(
        i.currency,
        (revenueTotals.get(i.currency) || 0) + i.totalCents,
      );
    }
    for (const i of pending) {
      pendingTotals.set(
        i.currency,
        (pendingTotals.get(i.currency) || 0) + i.totalCents,
      );
      receivablesTotals.set(
        i.currency,
        (receivablesTotals.get(i.currency) || 0) + i.totalCents,
      );
    }
    for (const i of overdue) {
      receivablesTotals.set(
        i.currency,
        (receivablesTotals.get(i.currency) || 0) + i.totalCents,
      );
    }

    const payablesTotals = new Map<string, number>();
    for (const l of filteredStatementLines) {
      if (String((l as any)?.status || "") === "sent") {
        // line currency not available; assume USD
        payablesTotals.set(
          "USD",
          (payablesTotals.get("USD") || 0) +
            (Number((l as any)?.net_cents || 0) || 0),
        );
      }
    }

    const commissionTotals = new Map<string, number>();
    const talentPaymentsTotals = new Map<string, number>();
    const taxTotals = new Map<string, number>();
    const grossServiceTotals = new Map<string, number>();
    for (const i of paid) {
      commissionTotals.set(
        i.currency,
        (commissionTotals.get(i.currency) || 0) + (i.agencyFeeCents || 0),
      );
      talentPaymentsTotals.set(
        i.currency,
        (talentPaymentsTotals.get(i.currency) || 0) + (i.talentNetCents || 0),
      );
      taxTotals.set(
        i.currency,
        (taxTotals.get(i.currency) || 0) + (i.taxCents || 0),
      );
      // Service gross (excluding tax/expenses/discount) approximated as stored subtotal
      grossServiceTotals.set(
        i.currency,
        (grossServiceTotals.get(i.currency) || 0) + (i.subtotalCents || 0),
      );
    }

    return {
      revenueTotals,
      pendingTotals,
      receivablesTotals,
      payablesTotals,
      commissionTotals,
      talentPaymentsTotals,
      taxTotals,
      grossServiceTotals,
      paidCount: paid.length,
      pendingCount: pending.length,
      overdueCount: overdue.length,
    };
  }, [filteredInvoices, filteredStatementLines]);

  const prevPeriodRevenueTotals = useMemo(() => {
    const now = new Date();
    const prev = (() => {
      if (reportPeriod === "this-year") return "last-year";
      if (reportPeriod === "this-quarter") return "last-quarter";
      if (reportPeriod === "this-month") return "last-month";
      if (reportPeriod === "last-year") return "last-year";
      if (reportPeriod === "last-quarter") return "last-quarter";
      if (reportPeriod === "last-month") return "last-month";
      return reportPeriod;
    })();

    const { start, end } = dateBoundsForPeriod(prev);
    // If the user picked a "last-*" period, shift one more back.
    if (reportPeriod === "last-year") {
      start.setFullYear(start.getFullYear() - 1);
      end.setFullYear(end.getFullYear() - 1);
    }
    if (reportPeriod === "last-quarter") {
      start.setMonth(start.getMonth() - 3);
      end.setMonth(end.getMonth() - 3);
    }
    if (reportPeriod === "last-month") {
      start.setMonth(start.getMonth() - 1);
      end.setMonth(end.getMonth() - 1);
    }

    const m = new Map<string, number>();
    for (const inv of normalizedInvoices) {
      const d = parseDate(inv.invoiceDate);
      if (!d) continue;
      if (d < start || d > end) continue;
      if (clientFilter !== "all" && inv.clientId !== clientFilter) continue;
      if (inv.status !== "paid") continue;
      m.set(inv.currency, (m.get(inv.currency) || 0) + (inv.totalCents || 0));
    }
    return m;
  }, [clientFilter, normalizedInvoices, parseDate, reportPeriod]);

  const growthRatePct = useMemo(() => {
    const cur = Array.from(summary.revenueTotals.values()).reduce(
      (a, b) => a + b,
      0,
    );
    const prev = Array.from(prevPeriodRevenueTotals.values()).reduce(
      (a, b) => a + b,
      0,
    );
    if (!prev) return 0;
    return ((cur - prev) / prev) * 100;
  }, [prevPeriodRevenueTotals, summary.revenueTotals]);

  const revenueByMonth = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const inv of filteredInvoices) {
      if (inv.status !== "paid") continue;
      const d = parseDate(inv.invoiceDate);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!m.has(key)) m.set(key, new Map());
      const byCur = m.get(key)!;
      byCur.set(
        inv.currency,
        (byCur.get(inv.currency) || 0) + (inv.totalCents || 0),
      );
    }
    return Array.from(m.entries())
      .map(([key, totals]) => ({ key, totals }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredInvoices, parseDate]);

  const topClientsByRevenue = useMemo(() => {
    const totals = new Map<string, Map<string, number>>();
    for (const inv of filteredInvoices) {
      if (inv.status !== "paid") continue;
      const cid = String(inv.clientId || "");
      if (!cid) continue;
      if (!totals.has(cid)) totals.set(cid, new Map());
      const byCur = totals.get(cid)!;
      byCur.set(
        inv.currency,
        (byCur.get(inv.currency) || 0) + (inv.totalCents || 0),
      );
    }
    return Array.from(totals.entries())
      .map(([clientId, byCur]) => ({
        clientId,
        clientName: clientNameById.get(clientId) || "(unknown)",
        totals: byCur,
        sort: Array.from(byCur.values()).reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.sort - a.sort)
      .slice(0, 5);
  }, [clientNameById, filteredInvoices]);

  const topTalentByRevenue = useMemo(() => {
    const totals = new Map<string, number>();
    const names = new Map<string, string>();
    for (const l of filteredStatementLines) {
      if (String((l as any)?.status || "") !== "paid") continue;
      const tid = String((l as any)?.talent_id || "");
      if (!tid) continue;
      totals.set(
        tid,
        (totals.get(tid) || 0) + (Number((l as any)?.gross_cents || 0) || 0),
      );
      const nm = String((l as any)?.talent_name || "");
      if (nm) names.set(tid, nm);
    }
    return Array.from(totals.entries())
      .map(([talentId, grossCents]) => ({
        talentId,
        talentName:
          String(talentNameById.get(talentId) || "").trim() ||
          names.get(talentId) ||
          "(unknown)",
        grossCents,
      }))
      .sort((a, b) => b.grossCents - a.grossCents)
      .slice(0, 5);
  }, [filteredStatementLines, talentNameById]);

  const filteredExpenses = useMemo(() => {
    const { start, end } = dateBoundsForPeriod(reportPeriod);
    return expenseRows
      .filter((ex) => {
        const d = parseDate((ex as any)?.expense_date);
        if (!d) return false;
        if (d < start || d > end) return false;
        const status = String((ex as any)?.status || "approved");
        if (status !== "approved") return false;
        return true;
      })
      .map((ex) => ({
        amountCents: Number((ex as any)?.amount_cents || 0) || 0,
        currency: String((ex as any)?.currency || "USD"),
      }));
  }, [expenseRows, reportPeriod]);

  const expensesTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const ex of filteredExpenses) {
      m.set(ex.currency, (m.get(ex.currency) || 0) + (ex.amountCents || 0));
    }
    return m;
  }, [filteredExpenses]);

  const netIncomeTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const [cur, cents] of summary.revenueTotals.entries()) {
      m.set(cur, (m.get(cur) || 0) + (cents || 0));
    }
    for (const [cur, cents] of expensesTotals.entries()) {
      m.set(cur, (m.get(cur) || 0) - (cents || 0));
    }
    return m;
  }, [summary.revenueTotals, expensesTotals]);

  const avgInvoiceTotals = useMemo(() => {
    const count = Math.max(1, filteredInvoices.length);
    const totals = new Map<string, number>();
    for (const inv of filteredInvoices) {
      totals.set(
        inv.currency,
        (totals.get(inv.currency) || 0) + (inv.totalCents || 0),
      );
    }
    const avg = new Map<string, number>();
    for (const [cur, cents] of totals.entries()) {
      avg.set(cur, Math.round((cents || 0) / count));
    }
    return avg;
  }, [filteredInvoices]);

  const receivables = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const open = filteredInvoices.filter(
      (i) => i.status === "sent" || i.status === "overdue",
    );
    const bucketDefs = [
      { key: "current", label: "Current (Not Due)", color: "green" },
      { key: "1_30", label: "1-30 Days Overdue", color: "yellow" },
      { key: "31_60", label: "31-60 Days Overdue", color: "orange" },
      { key: "61_90", label: "61-90 Days Overdue", color: "red" },
      { key: "90_plus", label: "90+ Days Overdue", color: "gray" },
    ] as const;

    const bucketTotals = new Map<string, Map<string, number>>();
    const bucketCounts = new Map<string, number>();
    for (const b of bucketDefs) {
      bucketTotals.set(b.key, new Map());
      bucketCounts.set(b.key, 0);
    }

    const dayDiff = (a: Date, b: Date) =>
      Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));

    for (const inv of open) {
      const due = parseDate(inv.dueDate);
      const overdueDays = due ? dayDiff(today, due) : 0;
      const key = (() => {
        if (!due) return "current";
        if (overdueDays <= 0) return "current";
        if (overdueDays <= 30) return "1_30";
        if (overdueDays <= 60) return "31_60";
        if (overdueDays <= 90) return "61_90";
        return "90_plus";
      })();
      const totals = bucketTotals.get(key)!;
      totals.set(
        inv.currency,
        (totals.get(inv.currency) || 0) + (inv.totalCents || 0),
      );
      bucketCounts.set(key, (bucketCounts.get(key) || 0) + 1);
    }

    const totalReceivablesTotals = new Map<string, number>();
    for (const inv of open) {
      totalReceivablesTotals.set(
        inv.currency,
        (totalReceivablesTotals.get(inv.currency) || 0) + (inv.totalCents || 0),
      );
    }

    const largestByClient = new Map<string, Map<string, number>>();
    for (const inv of open) {
      const cid = String(inv.clientId || "");
      if (!cid) continue;
      if (!largestByClient.has(cid)) largestByClient.set(cid, new Map());
      const byCur = largestByClient.get(cid)!;
      byCur.set(
        inv.currency,
        (byCur.get(inv.currency) || 0) + (inv.totalCents || 0),
      );
    }
    const largestClients = Array.from(largestByClient.entries())
      .map(([clientId, totals]) => ({
        clientId,
        clientName: clientNameById.get(clientId) || "(unknown)",
        totals,
        sort: Array.from(totals.values()).reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.sort - a.sort)
      .slice(0, 5);

    return {
      bucketDefs,
      bucketTotals,
      bucketCounts,
      totalReceivablesTotals,
      largestClients,
    };
  }, [clientNameById, filteredInvoices, parseDate]);

  const payablesByTalent = useMemo(() => {
    const m = new Map<string, number>();
    const names = new Map<string, string>();
    for (const l of filteredStatementLines) {
      if (String((l as any)?.status || "") !== "sent") continue;
      const tid = String((l as any)?.talent_id || "");
      if (!tid) continue;
      m.set(tid, (m.get(tid) || 0) + (Number((l as any)?.net_cents || 0) || 0));
      const nm = String((l as any)?.talent_name || "");
      if (nm) names.set(tid, nm);
    }
    const rows = Array.from(m.entries())
      .map(([talentId, netCents]) => ({
        talentId,
        talentName:
          String(talentNameById.get(talentId) || "").trim() ||
          names.get(talentId) ||
          "(unknown)",
        netCents,
      }))
      .sort((a, b) => b.netCents - a.netCents);
    const totalNetCents = rows.reduce((s, r) => s + (r.netCents || 0), 0);
    return { rows, totalNetCents };
  }, [filteredStatementLines, talentNameById]);

  const commissionByClient = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const inv of filteredInvoices) {
      if (inv.status !== "paid") continue;
      const cid = String(inv.clientId || "");
      if (!cid) continue;
      if (!m.has(cid)) m.set(cid, new Map());
      const byCur = m.get(cid)!;
      byCur.set(
        inv.currency,
        (byCur.get(inv.currency) || 0) + (inv.agencyFeeCents || 0),
      );
    }
    return Array.from(m.entries())
      .map(([clientId, totals]) => ({
        clientId,
        clientName: clientNameById.get(clientId) || "(unknown)",
        totals,
        sort: Array.from(totals.values()).reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.sort - a.sort)
      .slice(0, 5);
  }, [clientNameById, filteredInvoices]);

  const commissionByTalent = useMemo(() => {
    const m = new Map<string, number>();
    const names = new Map<string, string>();
    for (const l of filteredStatementLines) {
      if (String((l as any)?.status || "") !== "paid") continue;
      const tid = String((l as any)?.talent_id || "");
      if (!tid) continue;
      m.set(
        tid,
        (m.get(tid) || 0) + (Number((l as any)?.agency_fee_cents || 0) || 0),
      );
      const nm = String((l as any)?.talent_name || "");
      if (nm) names.set(tid, nm);
    }
    return Array.from(m.entries())
      .map(([talentId, feeCents]) => ({
        talentId,
        talentName:
          String(talentNameById.get(talentId) || "").trim() ||
          names.get(talentId) ||
          "(unknown)",
        feeCents,
      }))
      .sort((a, b) => b.feeCents - a.feeCents)
      .slice(0, 5);
  }, [filteredStatementLines, talentNameById]);

  const pl = useMemo(() => {
    const toNum = (map: Map<string, number>) =>
      Array.from(map.values()).reduce((a, b) => a + (b || 0), 0);
    const revenue = toNum(summary.grossServiceTotals);
    const cogs = toNum(summary.talentPaymentsTotals);
    const commission = toNum(summary.commissionTotals);
    const expenses = toNum(expensesTotals);
    const netProfit = commission - expenses;
    const profitMargin = revenue ? (netProfit / revenue) * 100 : 0;
    const expenseRatio = revenue ? (expenses / revenue) * 100 : 0;
    return {
      revenue,
      cogs,
      commission,
      expenses,
      netProfit,
      profitMargin,
      expenseRatio,
    };
  }, [
    expensesTotals,
    summary.commissionTotals,
    summary.grossServiceTotals,
    summary.talentPaymentsTotals,
  ]);

  const taxTotals = useMemo(() => {
    return summary.taxTotals;
  }, [summary.taxTotals]);

  const escapeCsv = (v: any) => {
    const s = String(v ?? "");
    if (/[\n\r,\"]/g.test(s)) return `"${s.replace(/\"/g, '""')}"`;
    return s;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const exportBaseName = useMemo(() => {
    const d = new Date();
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return `financial-report-${reportPeriod}-${ymd}`;
  }, [reportPeriod]);

  const buildExportPayload = () => {
    return {
      meta: {
        reportPeriod,
        clientFilter,
        talentFilter,
        generatedAt: new Date().toISOString(),
      },
      totals: {
        revenue: Array.from(summary.revenueTotals.entries()),
        pending: Array.from(summary.pendingTotals.entries()),
        receivables: Array.from(summary.receivablesTotals.entries()),
        expenses: Array.from(expensesTotals.entries()),
        netIncome: Array.from(netIncomeTotals.entries()),
        commission: Array.from(summary.commissionTotals.entries()),
        tax: Array.from(taxTotals.entries()),
      },
      topClientsByRevenue: topClientsByRevenue.map((c) => ({
        clientId: c.clientId,
        clientName: c.clientName,
        totals: Array.from(c.totals.entries()),
      })),
      topTalentByRevenue: topTalentByRevenue,
      receivables: {
        total: Array.from(receivables.totalReceivablesTotals.entries()),
        agingBuckets: receivables.bucketDefs.map((b) => ({
          key: b.key,
          label: b.label,
          totals: Array.from(
            (receivables.bucketTotals.get(b.key) || new Map()).entries(),
          ),
          count: receivables.bucketCounts.get(b.key) || 0,
        })),
        largestClients: receivables.largestClients.map((c) => ({
          clientId: c.clientId,
          clientName: c.clientName,
          totals: Array.from(c.totals.entries()),
        })),
      },
      payablesByTalent: payablesByTalent.rows,
      commissionByClient,
      commissionByTalent,
      profitAndLoss: pl,
    };
  };

  const handleExportExcel = () => {
    const payload = buildExportPayload();

    const lines: string[] = [];
    const addRow = (...cols: any[]) =>
      lines.push(cols.map(escapeCsv).join(","));

    addRow("Financial Report");
    addRow("Report Period", payload.meta.reportPeriod);
    addRow("Client Filter", payload.meta.clientFilter);
    addRow("Talent Filter", payload.meta.talentFilter);
    addRow("Generated At", payload.meta.generatedAt);
    lines.push("");

    addRow("Section", "Metric", "Value");
    addRow("Overview", "Total Revenue", moneyTotals(summary.revenueTotals));
    addRow("Overview", "Pending", moneyTotals(summary.pendingTotals));
    addRow(
      "Overview",
      "Outstanding Receivables",
      moneyTotals(summary.receivablesTotals),
    );
    addRow("Overview", "Expenses", moneyTotals(expensesTotals));
    addRow("Overview", "Net Income", moneyTotals(netIncomeTotals));
    addRow("Overview", "Commission", moneyTotals(summary.commissionTotals));
    addRow("Overview", "Sales Tax", moneyTotals(taxTotals));
    lines.push("");

    addRow("Top Clients by Revenue");
    addRow("Client", "Revenue");
    for (const c of topClientsByRevenue)
      addRow(c.clientName, moneyTotals(c.totals));
    lines.push("");

    addRow("Top Talent by Revenue");
    addRow("Talent", "Gross Revenue");
    for (const t of topTalentByRevenue)
      addRow(t.talentName, money(t.grossCents, "USD"));
    lines.push("");

    addRow("Outstanding Receivables Aging");
    addRow("Bucket", "Amount", "Invoices");
    for (const b of receivables.bucketDefs) {
      addRow(
        b.label,
        moneyTotals(receivables.bucketTotals.get(b.key) || new Map()),
        receivables.bucketCounts.get(b.key) || 0,
      );
    }
    lines.push("");

    addRow("Talent Payables");
    addRow("Talent", "Amount");
    for (const r of payablesByTalent.rows)
      addRow(r.talentName, money(r.netCents, "USD"));
    lines.push("");

    addRow("Commission by Client");
    addRow("Client", "Commission");
    for (const c of commissionByClient)
      addRow(c.clientName, moneyTotals(c.totals));
    lines.push("");

    addRow("Commission by Talent");
    addRow("Talent", "Commission");
    for (const t of commissionByTalent)
      addRow(t.talentName, money(t.feeCents, "USD"));
    lines.push("");

    addRow("Profit & Loss");
    addRow("Revenue", money(pl.revenue, "USD"));
    addRow("COGS (Talent Payments)", money(pl.cogs, "USD"));
    addRow("Gross Profit (Commission)", money(pl.commission, "USD"));
    addRow("Operating Expenses", money(pl.expenses, "USD"));
    addRow("Net Profit", money(pl.netProfit, "USD"));
    addRow("Profit Margin %", pl.profitMargin.toFixed(2));
    addRow("Expense Ratio %", pl.expenseRatio.toFixed(2));

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    downloadBlob(blob, `${exportBaseName}.csv`);
  };

  const handleExportPdf = () => {
    const title = "Financial Report";
    const meta = `Period: ${reportPeriod} | Client: ${clientFilter} | Talent: ${talentFilter}`;

    const tableRows = (rows: Array<[string, string]>) =>
      rows
        .map(
          ([a, b]) =>
            `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">${a}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;">${b}</td></tr>`,
        )
        .join("");

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; padding: 24px; color:#111827; }
      h1 { font-size: 18px; margin: 0 0 6px; }
      .meta { color:#6b7280; font-size: 12px; margin-bottom: 18px; }
      h2 { font-size: 14px; margin: 18px 0 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { text-align:left; background:#f9fafb; padding:6px 8px; border:1px solid #e5e7eb; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <div class="meta">${meta}</div>

    <h2>Overview</h2>
    <table>
      <thead><tr><th>Metric</th><th style="text-align:right;">Value</th></tr></thead>
      <tbody>
        ${tableRows([
          ["Total Revenue", moneyTotals(summary.revenueTotals)],
          ["Pending", moneyTotals(summary.pendingTotals)],
          ["Outstanding Receivables", moneyTotals(summary.receivablesTotals)],
          ["Expenses", moneyTotals(expensesTotals)],
          ["Net Income", moneyTotals(netIncomeTotals)],
          ["Commission", moneyTotals(summary.commissionTotals)],
          ["Sales Tax", moneyTotals(taxTotals)],
        ])}
      </tbody>
    </table>

    <h2>Top Clients by Revenue</h2>
    <table>
      <thead><tr><th>Client</th><th style="text-align:right;">Revenue</th></tr></thead>
      <tbody>
        ${topClientsByRevenue
          .map(
            (c) =>
              `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">${c.clientName}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;">${moneyTotals(c.totals)}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>

    <h2>Top Talent by Revenue</h2>
    <table>
      <thead><tr><th>Talent</th><th style="text-align:right;">Gross</th></tr></thead>
      <tbody>
        ${topTalentByRevenue
          .map(
            (t) =>
              `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">${t.talentName}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;">${money(t.grossCents, "USD")}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>

    <h2>Outstanding Receivables</h2>
    <table>
      <thead><tr><th>Aging Bucket</th><th style="text-align:right;">Amount</th><th style="text-align:right;">Invoices</th></tr></thead>
      <tbody>
        ${receivables.bucketDefs
          .map(
            (b) =>
              `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">${b.label}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;">${moneyTotals(receivables.bucketTotals.get(b.key) || new Map())}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;">${receivables.bucketCounts.get(b.key) || 0}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>

    <h2>Profit &amp; Loss</h2>
    <table>
      <thead><tr><th>Line</th><th style="text-align:right;">Amount</th></tr></thead>
      <tbody>
        ${tableRows([
          ["Revenue", money(pl.revenue, "USD")],
          ["COGS (Talent Payments)", `-${money(pl.cogs, "USD")}`],
          ["Gross Profit (Commission)", money(pl.commission, "USD")],
          ["Operating Expenses", `-${money(pl.expenses, "USD")}`],
          ["Net Profit", money(pl.netProfit, "USD")],
        ])}
      </tbody>
    </table>

    <script>
      window.onload = () => { window.focus(); window.print(); };
    </script>
  </body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Financial Reports</h2>
        <p className="text-gray-600 font-medium">
          Comprehensive financial analytics and insights
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <p className="text-sm font-bold text-gray-700">Total Revenue</p>
          </div>
          <p className="text-3xl font-bold text-green-600 mb-1">
            {moneyTotals(summary.revenueTotals)}
          </p>
          <p className="text-xs text-gray-600 font-medium">
            {summary.paidCount} paid invoices
          </p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <p className="text-sm font-bold text-gray-700">Pending</p>
          </div>
          <p className="text-3xl font-bold text-yellow-600 mb-1">
            {moneyTotals(summary.pendingTotals)}
          </p>
          <p className="text-xs text-gray-600 font-medium">
            {summary.pendingCount} invoices
          </p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <p className="text-sm font-bold text-gray-700">Expenses</p>
          </div>
          <p className="text-3xl font-bold text-red-600 mb-1">
            {moneyTotals(expensesTotals)}
          </p>
          <p className="text-xs text-gray-600 font-medium">
            {filteredExpenses.length} expenses
          </p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <p className="text-sm font-bold text-gray-700">Net Income</p>
          </div>
          <p className="text-3xl font-bold text-indigo-600 mb-1">
            {moneyTotals(netIncomeTotals)}
          </p>
          <p className="text-xs text-gray-600 font-medium">selected period</p>
        </Card>
      </div>

      <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">Financial Reports</h3>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-10 px-5 rounded-xl border-gray-200 font-bold flex items-center gap-2"
              onClick={handleExportPdf}
            >
              <FileDown className="w-4 h-4" />
              Export to PDF
            </Button>
            <Button
              variant="outline"
              className="h-10 px-5 rounded-xl border-gray-200 font-bold flex items-center gap-2"
              onClick={handleExportExcel}
            >
              <Download className="w-4 h-4" />
              Export to Excel
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <Label className="text-sm font-bold text-gray-700 mb-2 block">
              Report Period
            </Label>
            <Select value={reportPeriod} onValueChange={setReportPeriod}>
              <SelectTrigger className="h-11 rounded-xl border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
                <SelectItem value="this-quarter">This Quarter</SelectItem>
                <SelectItem value="last-quarter">Last Quarter</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-bold text-gray-700 mb-2 block">
              Filter by Client
            </Label>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-11 rounded-xl border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Clients</SelectItem>
                {asArray(clientRows).map((c: any) => (
                  <SelectItem key={String(c?.id)} value={String(c?.id)}>
                    {String(c?.company || "(unknown)")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-bold text-gray-700 mb-2 block">
              Filter by Talent
            </Label>
            <Select value={talentFilter} onValueChange={setTalentFilter}>
              <SelectTrigger className="h-11 rounded-xl border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Talent</SelectItem>
                {asArray(talentRows).map((t: any) => (
                  <SelectItem key={String(t?.id)} value={String(t?.id)}>
                    {String(t?.full_name || "(unknown)")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-100">
          {[
            { id: "revenue", label: "Revenue Report" },
            { id: "receivables", label: "Outstanding Receivables" },
            { id: "payables", label: "Talent Payables" },
            { id: "commission", label: "Commission Report" },
            { id: "profit", label: "Profit & Loss" },
            { id: "tax", label: "Tax Reports" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id)}
              className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${
                activeReportTab === tab.id
                  ? "text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeReportTab === "revenue" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card className="p-5 bg-green-50 border border-green-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <p className="text-xs font-bold text-gray-700">
                    Total Revenue
                  </p>
                </div>
                <p className="text-2xl font-bold text-green-600 mb-1">
                  {moneyTotals(summary.revenueTotals)}
                </p>
                <p className="text-[10px] text-gray-600 font-medium">
                  {summary.paidCount} paid invoices
                </p>
              </Card>
              <Card className="p-5 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-bold text-gray-700">
                    Pending Revenue
                  </p>
                </div>
                <p className="text-2xl font-bold text-blue-600 mb-1">
                  {moneyTotals(summary.receivablesTotals)}
                </p>
                <p className="text-[10px] text-gray-600 font-medium">
                  {summary.pendingCount + summary.overdueCount} outstanding
                  invoices
                </p>
              </Card>
              <Card className="p-5 bg-purple-50 border border-purple-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="w-4 h-4 text-purple-600" />
                  <p className="text-xs font-bold text-gray-700">Avg Invoice</p>
                </div>
                <p className="text-2xl font-bold text-purple-600 mb-1">
                  {moneyTotals(avgInvoiceTotals)}
                </p>
                <p className="text-[10px] text-gray-600 font-medium">
                  per invoice
                </p>
              </Card>
              <Card className="p-5 bg-orange-50 border border-orange-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  <p className="text-xs font-bold text-gray-700">Growth Rate</p>
                </div>
                <p className="text-2xl font-bold text-orange-600 mb-1">
                  {growthRatePct >= 0 ? "+" : ""}
                  {growthRatePct.toFixed(1)}%
                </p>
                <p className="text-[10px] text-gray-600 font-medium">
                  vs previous period
                </p>
              </Card>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-900 mb-3">
                Revenue by Month
              </h4>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                  style={{
                    width: (() => {
                      const last = revenueByMonth[revenueByMonth.length - 1];
                      if (!last) return "0%";
                      const max = Math.max(
                        1,
                        ...revenueByMonth.map((x) =>
                          Array.from(x.totals.values()).reduce(
                            (a, b) => a + b,
                            0,
                          ),
                        ),
                      );
                      const v = Array.from(last.totals.values()).reduce(
                        (a, b) => a + b,
                        0,
                      );
                      return `${Math.round((v / max) * 100)}%`;
                    })(),
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 font-medium mt-2">
                {(() => {
                  const last = revenueByMonth[revenueByMonth.length - 1];
                  if (!last) return "No paid invoices";
                  return `${last.key}: ${moneyTotals(last.totals)}`;
                })()}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Card className="p-5 bg-gray-50 border border-gray-100 rounded-xl">
                <h4 className="text-sm font-bold text-gray-900 mb-4">
                  Top Clients by Revenue
                </h4>
                {topClientsByRevenue.length ? (
                  <div className="space-y-2">
                    {topClientsByRevenue.map((c) => (
                      <div
                        key={c.clientId}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg"
                      >
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">
                            {c.clientName}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          {moneyTotals(c.totals)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 font-medium">
                    No revenue yet
                  </div>
                )}
              </Card>
              <Card className="p-5 bg-gray-50 border border-gray-100 rounded-xl">
                <h4 className="text-sm font-bold text-gray-900 mb-4">
                  Top Talent by Revenue
                </h4>
                {topTalentByRevenue.length ? (
                  <div className="space-y-2">
                    {topTalentByRevenue.map((t) => (
                      <div
                        key={t.talentId}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg"
                      >
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">
                            {t.talentName}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          {money(t.grossCents, "USD")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 font-medium">
                    No revenue yet
                  </div>
                )}
              </Card>
            </div>
          </>
        )}

        {activeReportTab === "receivables" && (
          <div className="space-y-6">
            <Card className="p-8 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2">
                  Total Outstanding Receivables
                </p>
                <p className="text-5xl font-bold text-red-600">
                  {moneyTotals(receivables.totalReceivablesTotals)}
                </p>
              </div>
              <AlertCircle className="w-12 h-12 text-red-600" />
            </Card>

            <div className="grid grid-cols-5 gap-4">
              {receivables.bucketDefs.map((aging) => (
                <Card
                  key={aging.label}
                  className={`p-4 bg-${aging.color}-50 border border-${aging.color}-100 rounded-xl`}
                >
                  <p className="text-[10px] font-bold text-gray-700 mb-2">
                    {aging.label}
                  </p>
                  <p className={`text-xl font-bold text-${aging.color}-600`}>
                    {moneyTotals(
                      receivables.bucketTotals.get(aging.key) || new Map(),
                    )}
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {receivables.bucketCounts.get(aging.key) || 0} invoices
                  </p>
                </Card>
              ))}
            </div>

            <Card className="p-6 bg-gray-50 border border-gray-100 rounded-xl">
              <h4 className="text-base font-bold text-gray-900 mb-4">
                Largest Outstanding Clients
              </h4>
              {receivables.largestClients.length ? (
                <div className="space-y-2">
                  {receivables.largestClients.map((c) => (
                    <div
                      key={c.clientId}
                      className="flex items-center justify-between p-3 bg-white rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {c.clientName}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-red-600">
                        {moneyTotals(c.totals)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 font-medium">
                  No outstanding receivables
                </div>
              )}
            </Card>
          </div>
        )}

        {activeReportTab === "payables" && (
          <div className="space-y-6">
            <Card className="p-8 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2">
                  Total Owed to All Talent
                </p>
                <p className="text-5xl font-bold text-orange-600">
                  {money(payablesByTalent.totalNetCents, "USD")}
                </p>
              </div>
              <Users className="w-12 h-12 text-orange-600" />
            </Card>

            <Card className="p-6 bg-gray-50 border border-gray-100 rounded-xl">
              <h4 className="text-base font-bold text-gray-900 mb-4">
                Breakdown by Talent
              </h4>
              {payablesByTalent.rows.length ? (
                <div className="space-y-2">
                  {payablesByTalent.rows.slice(0, 10).map((r) => (
                    <div
                      key={r.talentId}
                      className="flex items-center justify-between p-3 bg-white rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-purple-600" />
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {r.talentName}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-orange-600">
                        {money(r.netCents, "USD")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 font-medium">
                  No pending talent payables
                </div>
              )}
            </Card>
          </div>
        )}

        {activeReportTab === "commission" && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <Card className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="w-4 h-4 text-indigo-600" />
                  <p className="text-sm font-bold text-gray-700">
                    Total Commission Earned
                  </p>
                </div>
                <p className="text-3xl font-bold text-indigo-600 mb-1">
                  {moneyTotals(summary.commissionTotals)}
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  20% of revenue
                </p>
              </Card>
              <Card className="p-6 bg-purple-50 border border-purple-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-bold text-gray-700">
                    Avg Commission per Deal
                  </p>
                </div>
                <p className="text-3xl font-bold text-purple-600 mb-1">
                  {(() => {
                    const deals = Math.max(1, summary.paidCount);
                    const totals = new Map<string, number>();
                    for (const [
                      cur,
                      cents,
                    ] of summary.commissionTotals.entries()) {
                      totals.set(cur, Math.round((cents || 0) / deals));
                    }
                    return moneyTotals(totals);
                  })()}
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  Average earned
                </p>
              </Card>
              <Card className="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-bold text-gray-700">
                    Commission Rate
                  </p>
                </div>
                <p className="text-3xl font-bold text-blue-600 mb-1">20%</p>
                <p className="text-xs text-gray-600 font-medium">
                  Consistent across all deals
                </p>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Card className="p-6 bg-gray-50 border border-gray-100 rounded-xl">
                <h4 className="text-base font-bold text-gray-900 mb-4">
                  Commission by Client
                </h4>
                {commissionByClient.length ? (
                  <div className="space-y-2">
                    {commissionByClient.map((c) => (
                      <div
                        key={c.clientId}
                        className="flex items-center justify-between p-3 bg-white rounded-lg"
                      >
                        <p className="text-sm font-bold text-gray-900">
                          {c.clientName}
                        </p>
                        <span className="text-sm font-bold text-indigo-600">
                          {moneyTotals(c.totals)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 font-medium">
                    No commission data available
                  </div>
                )}
              </Card>
              <Card className="p-6 bg-gray-50 border border-gray-100 rounded-xl">
                <h4 className="text-base font-bold text-gray-900 mb-4">
                  Commission by Talent
                </h4>
                {commissionByTalent.length ? (
                  <div className="space-y-2">
                    {commissionByTalent.map((t) => (
                      <div
                        key={t.talentId}
                        className="flex items-center justify-between p-3 bg-white rounded-lg"
                      >
                        <p className="text-sm font-bold text-gray-900">
                          {t.talentName}
                        </p>
                        <span className="text-sm font-bold text-indigo-600">
                          {money(t.feeCents, "USD")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 font-medium">
                    No commission data available
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeReportTab === "profit" && (
          <div className="space-y-6">
            <Card className="p-8 bg-white border border-gray-100 rounded-2xl">
              <h4 className="text-xl font-bold text-gray-900 mb-8 text-center">
                Profit & Loss Statement
              </h4>
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl border border-green-100">
                  <span className="text-base font-bold text-gray-900">
                    Revenue (Gross from Invoices)
                  </span>
                  <span className="text-xl font-bold text-green-600">
                    {money(pl.revenue, "USD")}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                  <span className="text-base font-bold text-gray-900">
                    Less: Talent Payments (COGS)
                  </span>
                  <span className="text-xl font-bold text-red-600">
                    -{money(pl.cogs, "USD")}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-base font-bold text-gray-900">
                    Gross Profit (Agency Commission)
                  </span>
                  <span className="text-xl font-bold text-blue-600">
                    {money(pl.commission, "USD")}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <span className="text-base font-bold text-gray-900">
                    Less: Operating Expenses
                  </span>
                  <span className="text-xl font-bold text-orange-600">
                    -{money(pl.expenses, "USD")}
                  </span>
                </div>
                <div className="flex justify-between items-center p-6 bg-green-50 rounded-2xl border-4 border-green-400 mt-6">
                  <span className="text-2xl font-bold text-gray-900">
                    Net Profit
                  </span>
                  <span className="text-4xl font-bold text-green-600">
                    {money(pl.netProfit, "USD")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-12 max-w-2xl mx-auto">
                <Card className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center">
                  <p className="text-xs font-bold text-gray-500 mb-1">
                    Profit Margin
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {pl.profitMargin.toFixed(1)}%
                  </p>
                </Card>
                <Card className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center">
                  <p className="text-xs font-bold text-gray-500 mb-1">
                    Expense Ratio
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {pl.expenseRatio.toFixed(1)}%
                  </p>
                </Card>
              </div>
            </Card>
          </div>
        )}

        {activeReportTab === "tax" && (
          <div className="space-y-6">
            <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
              <h4 className="text-lg font-bold text-gray-900 mb-6">
                Tax Summary
              </h4>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <Card className="p-6 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-sm font-bold text-gray-700 mb-2">
                    Sales Tax Collected
                  </p>
                  <p className="text-3xl font-bold text-blue-600 mb-1">
                    {moneyTotals(taxTotals)}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                    Sales tax only
                  </p>
                </Card>
                <Card className="p-6 bg-orange-50 border border-orange-100 rounded-xl">
                  <p className="text-sm font-bold text-gray-700 mb-2">
                    1099 Eligible Payments
                  </p>
                  <p className="text-3xl font-bold text-orange-600 mb-1">
                    {money(payablesByTalent.totalNetCents, "USD")}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                    US talent payments
                  </p>
                </Card>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-12 justify-between px-6 rounded-xl border-gray-200 hover:bg-gray-50 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-900">
                        Export Sales Tax Report
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        Breakdown by state/region
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 justify-between px-6 rounded-xl border-gray-200 hover:bg-gray-50 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                      <Receipt className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-900">
                        Export VAT Report
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        Breakdown by country
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 justify-between px-6 rounded-xl border-gray-200 hover:bg-gray-50 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                      <FileText className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-900">
                        Prepare 1099 Forms
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        US talent with payments &gt; $600
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Button>
              </div>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
};

const GenerateInvoiceView = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [createFrom, setCreateFrom] = useState("booking");
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clients, setClients] = useState<any[]>([]);
  const [talents, setTalents] = useState<any[]>([]);
  const [invoiceDate, setInvoiceDate] = useState("2026-01-13");
  const [dueDate, setDueDate] = useState("2026-02-13");
  const [paymentTerms, setPaymentTerms] = useState("net_30");
  const [poNumber, setPoNumber] = useState("");
  const [projectReference, setProjectReference] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notesInternal, setNotesInternal] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState(
    "Payment due within 30 days. Please reference invoice number on payment.",
  );
  const [footerText, setFooterText] = useState("Thank you for your business!");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentOnce, setEmailSentOnce] = useState(false);
  const fileInputId = useMemo(
    () => `invoice-attach-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const [commission, setCommission] = useState("20");
  const [taxExempt, setTaxExempt] = useState(false);
  const [items, setItems] = useState<
    {
      id: string;
      description: string;
      talent_id: string;
      date_of_service: string;
      rate_type: "day" | "hourly" | "project";
      quantity: string;
      unit_price: string;
    }[]
  >([
    {
      id: Math.random().toString(36).slice(2),
      description: "",
      talent_id: "",
      date_of_service: "",
      rate_type: "day",
      quantity: "1",
      unit_price: "0",
    },
  ]);
  const [expenses, setExpenses] = useState<
    { id: string; description: string; amount: string }[]
  >([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await getAgencyClients();
        const rows = Array.isArray((resp as any)?.data)
          ? (resp as any).data
          : Array.isArray(resp)
            ? resp
            : Array.isArray((resp as any)?.data?.data)
              ? (resp as any).data.data
              : [];
        if (!mounted) return;
        setClients(rows);
      } catch (e: any) {
        toast({
          title: "Failed to load clients",
          description: String(e?.message || e),
          variant: "destructive" as any,
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const selectedClient = useMemo(() => {
    return (
      clients.find((c) => String((c as any)?.id || "") === selectedClientId) ||
      null
    );
  }, [clients, selectedClientId]);

  const formatMoney = useMemo(() => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 2,
      });
    } catch {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      });
    }
  }, [currency]);

  const calcLineTotal = (it: { quantity: string; unit_price: string }) => {
    const qty = Number(it.quantity || "0") || 0;
    const unit = Number(it.unit_price || "0") || 0;
    return qty * unit;
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + calcLineTotal(it), 0);
  }, [items]);

  const expensesTotal = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount || "0") || 0), 0);
  }, [expenses]);

  const commissionPct = useMemo(() => {
    const v = Number(commission || "0") || 0;
    return Math.max(0, v);
  }, [commission]);

  const agencyCommissionAmount = useMemo(() => {
    return (subtotal * commissionPct) / 100;
  }, [subtotal, commissionPct]);

  const talentNetAmount = useMemo(() => {
    return subtotal - agencyCommissionAmount;
  }, [subtotal, agencyCommissionAmount]);

  const grandTotal = useMemo(() => {
    return subtotal + expensesTotal;
  }, [subtotal, expensesTotal]);

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("file_read_failed"));
      r.onload = () => {
        const res = String(r.result || "");
        const idx = res.indexOf(",");
        resolve(idx >= 0 ? res.slice(idx + 1) : res);
      };
      r.readAsDataURL(file);
    });

  const validateInvoice = () => {
    if (!selectedClientId) {
      return { ok: false, message: "Please select a client." };
    }
    if (!String(invoiceDate || "").trim()) {
      return { ok: false, message: "Please select an invoice date." };
    }
    if (!String(dueDate || "").trim()) {
      return { ok: false, message: "Please select a due date." };
    }
    if (!String(currency || "").trim()) {
      return { ok: false, message: "Please select a currency." };
    }
    if (!String(paymentTerms || "").trim()) {
      return { ok: false, message: "Please select payment terms." };
    }

    const validItems = items
      .map((it) => {
        const desc = String(it.description || "").trim();
        const qty = Number(it.quantity || "0") || 0;
        const unit = Number(it.unit_price || "0");
        const unitOk = Number.isFinite(unit) && unit >= 0;
        return { desc, qty, unitOk };
      })
      .filter((it) => it.desc.length > 0);

    if (!validItems.length) {
      return {
        ok: false,
        message: "Please add at least one line item with a description.",
      };
    }
    if (validItems.some((it) => it.qty <= 0)) {
      return {
        ok: false,
        message: "Line item quantity must be greater than 0.",
      };
    }
    if (validItems.some((it) => !it.unitOk)) {
      return {
        ok: false,
        message: "Line item unit price must be a number (0 or more).",
      };
    }
    return { ok: true, message: "" };
  };

  const invoiceFormOk = useMemo(() => {
    return validateInvoice().ok;
  }, [selectedClientId, invoiceDate, dueDate, currency, paymentTerms, items]);

  const downloadPdf = async () => {
    const validation = validateInvoice();
    if (!validation.ok) {
      toast({
        title: "Missing required fields",
        description: validation.message,
        variant: "destructive" as any,
      });
      return;
    }
    try {
      const base64 = await generateInvoicePdfBase64();
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = invoiceNumber
        ? `invoice-${invoiceNumber}.pdf`
        : "invoice.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({
        title: "Failed to generate PDF",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    }
  };

  const markAsSent = async () => {
    if (!invoiceId) {
      toast({
        title: "Save invoice first",
        description:
          "Please save as draft to generate an invoice number before marking as sent.",
        variant: "destructive" as any,
      });
      return;
    }
    try {
      await markInvoiceSent(invoiceId);
      toast({
        title: "Marked as sent",
        description: invoiceNumber
          ? `Invoice ${invoiceNumber} marked as sent.`
          : "Invoice marked as sent.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to mark as sent",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    }
  };

  const markAsPaid = async () => {
    if (!invoiceId) {
      toast({
        title: "Save invoice first",
        description:
          "Please save as draft to generate an invoice number before marking as paid.",
        variant: "destructive" as any,
      });
      return;
    }
    try {
      await markInvoicePaid(invoiceId);
      toast({
        title: "Marked as paid",
        description: invoiceNumber
          ? `Invoice ${invoiceNumber} marked as paid.`
          : "Invoice marked as paid.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to mark as paid",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    }
  };

  const bytesToBase64 = (bytes: Uint8Array) => {
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  };

  const buildCreateInvoicePayload = () => {
    const commissionPct = Number(commission || "0") || 0;
    const agency_commission_bps = Math.round(commissionPct * 100);
    const itemPayload = items
      .map((it, idx) => ({
        description: it.description,
        talent_id: it.talent_id || undefined,
        date_of_service: it.date_of_service || undefined,
        rate_type: it.rate_type,
        quantity: Number(it.quantity || "0") || 0,
        unit_price_cents: Math.round((Number(it.unit_price || "0") || 0) * 100),
        sort_order: idx,
      }))
      .filter((it) => (it.description || "").trim().length > 0);

    return {
      client_id: selectedClientId,
      invoice_date: invoiceDate,
      due_date: dueDate,
      payment_terms: paymentTerms,
      po_number: poNumber || undefined,
      project_reference: projectReference || undefined,
      currency,
      agency_commission_bps,
      tax_exempt: taxExempt,
      tax_rate_bps: 0,
      discount_cents: 0,
      notes_internal: notesInternal || undefined,
      payment_instructions: paymentInstructions || undefined,
      footer_text: footerText || undefined,
      items: itemPayload,
      expenses: expenses.map((e) => ({
        description: e.description,
        amount_cents: Math.round((Number(e.amount || "0") || 0) * 100),
        taxable: false,
      })),
    };
  };

  const ensureInvoiceSaved = async () => {
    if (invoiceId) return { id: invoiceId, invoice_number: invoiceNumber };
    const resp = await createInvoice(buildCreateInvoicePayload());
    const data = (resp as any)?.data ?? resp;
    const newId = String((data as any)?.id || "");
    const newNumber = String((data as any)?.invoice_number || "");
    if (newId) setInvoiceId(newId);
    if (newNumber) setInvoiceNumber(newNumber);
    return { id: newId, invoice_number: newNumber };
  };

  const tryFetchLogoPng = async (): Promise<Uint8Array | null> => {
    try {
      const resp = await fetch("/likelee-logo.png");
      if (!resp.ok) return null;
      const buf = await resp.arrayBuffer();
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  };

  const generateInvoicePdfBase64 = async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const cText = rgb(0.12, 0.12, 0.12);
    const cMuted = rgb(0.45, 0.45, 0.45);
    const cBorder = rgb(0.9, 0.92, 0.95);
    const cBg = rgb(0.98, 0.98, 0.99);

    const margin = 36;
    const gap = 14;
    const money = (n: number) => formatMoney.format(n);

    const drawCard = (x: number, y: number, w: number, h: number) => {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color: cBg,
        borderColor: cBorder,
        borderWidth: 1,
      });
    };

    const drawLabel = (text: string, x: number, y: number) => {
      page.drawText(text.toUpperCase(), {
        x,
        y,
        size: 8,
        font: fontBold,
        color: cMuted,
      });
    };

    const drawValue = (text: string, x: number, y: number, bold = false) => {
      page.drawText(text, {
        x,
        y,
        size: 11,
        font: bold ? fontBold : font,
        color: cText,
      });
    };

    const agencyName =
      String((profile as any)?.company_name || "").trim() ||
      String((profile as any)?.company || "").trim() ||
      String((profile as any)?.name || "").trim() ||
      String((profile as any)?.full_name || "").trim() ||
      "Agency";

    const clientCompany = String((selectedClient as any)?.company || "").trim();
    const clientName = String((selectedClient as any)?.name || "").trim();
    const clientEmail = String((selectedClient as any)?.email || "").trim();

    const invoiceNo = invoiceNumber ? invoiceNumber : "(not assigned yet)";
    const statusText = invoiceId ? "issued" : "draft";

    const logoBytes = await tryFetchLogoPng();
    if (logoBytes) {
      try {
        const img = await doc.embedPng(logoBytes);
        const imgW = 34;
        const imgH = (img.height / img.width) * imgW;
        page.drawImage(img, {
          x: margin,
          y: height - margin - imgH + 2,
          width: imgW,
          height: imgH,
        });
      } catch {
        // ignore
      }
    }

    page.drawText("Likelee", {
      x: margin + (logoBytes ? 42 : 0),
      y: height - margin - 16,
      size: 16,
      font: fontBold,
      color: cText,
    });
    page.drawText("Invoice", {
      x: margin,
      y: height - margin - 44,
      size: 28,
      font: fontBold,
      color: cText,
    });
    page.drawText(invoiceNo, {
      x: margin,
      y: height - margin - 66,
      size: 11,
      font,
      color: cMuted,
    });
    page.drawText(`From: ${agencyName} (sent via Likelee)`, {
      x: margin,
      y: height - margin - 86,
      size: 10,
      font,
      color: cMuted,
    });

    const metaW = 230;
    const metaH = 92;
    const metaX = width - margin - metaW;
    const metaY = height - margin - metaH;
    drawCard(metaX, metaY, metaW, metaH);
    drawLabel("Invoice date", metaX + 14, metaY + metaH - 22);
    drawValue(
      invoiceDate,
      metaX + metaW - 14 - font.widthOfTextAtSize(invoiceDate, 11),
      metaY + metaH - 24,
    );
    drawLabel("Due date", metaX + 14, metaY + metaH - 46);
    drawValue(
      dueDate,
      metaX + metaW - 14 - font.widthOfTextAtSize(dueDate, 11),
      metaY + metaH - 48,
    );
    drawLabel("Status", metaX + 14, metaY + metaH - 70);
    drawValue(
      statusText,
      metaX + metaW - 14 - font.widthOfTextAtSize(statusText, 11),
      metaY + metaH - 72,
    );

    const cardW = (width - margin * 2 - gap) / 2;
    const cardH = 92;
    const cardsTopY = height - margin - 130;

    const billX = margin;
    const billY = cardsTopY - cardH;
    drawCard(billX, billY, cardW, cardH);
    drawLabel("Bill to", billX + 14, billY + cardH - 22);
    const billLineY = billY + cardH - 44;
    if (clientCompany) {
      drawValue(clientCompany, billX + 14, billLineY, true);
      if (clientName) drawValue(clientName, billX + 14, billLineY - 16);
      if (clientEmail) drawValue(clientEmail, billX + 14, billLineY - 32);
    } else {
      drawValue(clientName || "Client", billX + 14, billLineY, true);
      if (clientEmail) drawValue(clientEmail, billX + 14, billLineY - 16);
    }

    const refX = margin + cardW + gap;
    const refY = billY;
    drawCard(refX, refY, cardW, cardH);
    drawLabel("Reference", refX + 14, refY + cardH - 22);
    if (projectReference) {
      drawValue(projectReference, refX + 14, refY + cardH - 44, true);
    }

    let y = billY - 24;
    page.drawText("LINE ITEMS", {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: cMuted,
    });
    y -= 10;

    const tableX = margin;
    const tableW = width - margin * 2;
    const rowH = 28;
    page.drawLine({
      start: { x: tableX, y },
      end: { x: tableX + tableW, y },
      thickness: 1,
      color: cBorder,
    });
    y -= 18;
    page.drawText("DESCRIPTION", {
      x: tableX,
      y,
      size: 9,
      font: fontBold,
      color: cMuted,
    });
    page.drawText("QTY", {
      x: tableX + tableW - 170,
      y,
      size: 9,
      font: fontBold,
      color: cMuted,
    });
    page.drawText("UNIT", {
      x: tableX + tableW - 120,
      y,
      size: 9,
      font: fontBold,
      color: cMuted,
    });
    page.drawText("TOTAL", {
      x: tableX + tableW - 56,
      y,
      size: 9,
      font: fontBold,
      color: cMuted,
    });
    y -= 10;
    page.drawLine({
      start: { x: tableX, y },
      end: { x: tableX + tableW, y },
      thickness: 1,
      color: cBorder,
    });
    y -= 18;

    const itemRows = items
      .map((it) => ({
        ...it,
        desc: (it.description || "").replace(/\s+/g, " ").trim(),
        qty: Number(it.quantity || "0") || 0,
        unit: Number(it.unit_price || "0") || 0,
      }))
      .filter((it) => it.desc.length > 0);

    if (!itemRows.length) {
      page.drawText("No line items", {
        x: tableX,
        y,
        size: 10,
        font,
        color: cMuted,
      });
      y -= rowH;
    } else {
      for (const it of itemRows.slice(0, 6)) {
        const total = it.qty * it.unit;
        page.drawText(it.desc.slice(0, 44), {
          x: tableX,
          y,
          size: 10,
          font: fontBold,
          color: cText,
        });

        const sub = [
          (() => {
            const talentName = String(
              talents.find(
                (t) =>
                  String((t as any)?.id || "") === String(it.talent_id || ""),
              )?.name ||
                talents.find(
                  (t) =>
                    String((t as any)?.id || "") === String(it.talent_id || ""),
                )?.full_name ||
                "",
            ).trim();
            const date = String(it.date_of_service || "").trim();
            const rate = String(it.rate_type || "").trim();
            return [talentName, date, rate].filter(Boolean).join(" • ");
          })(),
        ]
          .filter(Boolean)
          .join(" ");

        if (sub) {
          page.drawText(sub.slice(0, 60), {
            x: tableX,
            y: y - 12,
            size: 9,
            font,
            color: cMuted,
          });
        }

        page.drawText(String(it.qty), {
          x: tableX + tableW - 170,
          y,
          size: 10,
          font,
          color: cText,
        });
        page.drawText(money(it.unit), {
          x: tableX + tableW - 120,
          y,
          size: 10,
          font,
          color: cText,
        });
        page.drawText(money(total), {
          x: tableX + tableW - 56,
          y,
          size: 10,
          font: fontBold,
          color: cText,
        });

        y -= rowH;
        page.drawLine({
          start: { x: tableX, y },
          end: { x: tableX + tableW, y },
          thickness: 1,
          color: cBorder,
        });
        y -= 14;
      }
    }

    page.drawText("EXPENSES", {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: cMuted,
    });
    y -= 10;
    page.drawLine({
      start: { x: tableX, y },
      end: { x: tableX + tableW, y },
      thickness: 1,
      color: cBorder,
    });
    y -= 18;
    page.drawText("DESCRIPTION", {
      x: tableX,
      y,
      size: 9,
      font: fontBold,
      color: cMuted,
    });
    page.drawText("TAXABLE", {
      x: tableX + tableW - 160,
      y,
      size: 9,
      font: fontBold,
      color: cMuted,
    });
    page.drawText("AMOUNT", {
      x: tableX + tableW - 70,
      y,
      size: 9,
      font: fontBold,
      color: cMuted,
    });
    y -= 10;
    page.drawLine({
      start: { x: tableX, y },
      end: { x: tableX + tableW, y },
      thickness: 1,
      color: cBorder,
    });
    y -= 18;

    if (!expenses.length) {
      page.drawText("No expenses", {
        x: tableX,
        y,
        size: 10,
        font,
        color: cMuted,
      });
      y -= 28;
    } else {
      for (const e of expenses.slice(0, 4)) {
        const desc = String(e.description || "").trim() || "Expense";
        const amount = Number(e.amount || "0") || 0;
        page.drawText(desc.slice(0, 44), {
          x: tableX,
          y,
          size: 10,
          font,
          color: cText,
        });
        page.drawText("No", {
          x: tableX + tableW - 160,
          y,
          size: 10,
          font,
          color: cText,
        });
        page.drawText(money(amount), {
          x: tableX + tableW - 70,
          y,
          size: 10,
          font: fontBold,
          color: cText,
        });
        y -= 28;
        page.drawLine({
          start: { x: tableX, y },
          end: { x: tableX + tableW, y },
          thickness: 1,
          color: cBorder,
        });
        y -= 14;
      }
    }

    const bottomY = margin + 170;
    if (y < bottomY) y = bottomY;

    const lowerCardW = cardW;
    const lowerCardH = 140;
    const leftLowerX = margin;
    const leftLowerY = margin + 20;
    const rightLowerX = margin + lowerCardW + gap;
    const rightLowerY = leftLowerY;

    drawCard(leftLowerX, leftLowerY, lowerCardW, lowerCardH);
    drawLabel(
      "Payment instructions",
      leftLowerX + 14,
      leftLowerY + lowerCardH - 22,
    );
    page.drawText(String(paymentInstructions || "").slice(0, 140), {
      x: leftLowerX + 14,
      y: leftLowerY + lowerCardH - 46,
      size: 10,
      font,
      color: cText,
      lineHeight: 12,
    });
    page.drawLine({
      start: { x: leftLowerX + 14, y: leftLowerY + 54 },
      end: { x: leftLowerX + lowerCardW - 14, y: leftLowerY + 54 },
      thickness: 1,
      color: cBorder,
    });
    drawLabel("Footer", leftLowerX + 14, leftLowerY + 44);
    page.drawText(String(footerText || "").slice(0, 90), {
      x: leftLowerX + 14,
      y: leftLowerY + 26,
      size: 10,
      font,
      color: cText,
    });

    drawCard(rightLowerX, rightLowerY, lowerCardW, lowerCardH);
    const tx = rightLowerX + 14;
    let ty = rightLowerY + lowerCardH - 34;
    const drawTotalRow = (label: string, value: string, bold = false) => {
      page.drawText(label, { x: tx, y: ty, size: 10, font, color: cText });
      page.drawText(value, {
        x:
          rightLowerX +
          lowerCardW -
          14 -
          font.widthOfTextAtSize(value, bold ? 11 : 10),
        y: ty,
        size: bold ? 11 : 10,
        font: bold ? fontBold : font,
        color: cText,
      });
      ty -= 18;
    };

    drawTotalRow("Subtotal", money(subtotal), true);
    drawTotalRow("Expenses", money(expensesTotal));
    drawTotalRow("Discount", "-$0.00");
    drawTotalRow("Tax (0%)", "$0.00");
    page.drawLine({
      start: { x: tx, y: ty + 6 },
      end: { x: rightLowerX + lowerCardW - 14, y: ty + 6 },
      thickness: 1,
      color: cBorder,
    });
    ty -= 14;
    drawTotalRow("Total", money(grandTotal), true);
    drawTotalRow(
      `Agency fee (${commissionPct}%)`,
      money(agencyCommissionAmount),
    );
    drawTotalRow("Talent net", money(talentNetAmount));

    const bytes = await doc.save();
    return bytesToBase64(bytes);
  };

  const saveDraft = async () => {
    const validation = validateInvoice();
    if (!validation.ok) {
      toast({
        title: "Missing required fields",
        description: validation.message,
        variant: "destructive" as any,
      });
      return;
    }
    try {
      const resp = await createInvoice(buildCreateInvoicePayload());

      const data = (resp as any)?.data ?? resp;
      setInvoiceId(String((data as any)?.id || ""));
      setInvoiceNumber(String((data as any)?.invoice_number || ""));

      toast({
        title: "Draft saved",
        description: "Invoice draft created successfully.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to save draft",
        description: String((e as any)?.message || e),
        variant: "destructive" as any,
      });
    }
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    setUploadingFile(true);
    try {
      setAttachedFiles((prev) => [...prev, file]);
      await uploadAgencyFile(file);
      toast({
        title: "File uploaded",
        description: file.name,
      });
    } catch (e: any) {
      toast({
        title: "File upload failed",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const emailToClient = async () => {
    if (emailSending) return;
    const validation = validateInvoice();
    if (!validation.ok) {
      toast({
        title: "Missing required fields",
        description: validation.message,
        variant: "destructive" as any,
      });
      return;
    }
    const to = String((selectedClient as any)?.email || "").trim();
    if (!to) {
      toast({
        title: "Missing client email",
        description: "Selected client does not have an email address.",
        variant: "destructive" as any,
      });
      return;
    }

    try {
      setEmailSending(true);
      toast({
        title: "Sending invoice…",
        description:
          "Generating PDF and sending email in the background. Please keep this tab open.",
      });

      await ensureInvoiceSaved();

      const agencyName =
        String((profile as any)?.agency_name || "").trim() ||
        String((profile as any)?.display_name || "").trim() ||
        String((profile as any)?.company_name || "").trim() ||
        String((profile as any)?.company || "").trim() ||
        String((profile as any)?.name || "").trim() ||
        String((profile as any)?.full_name || "").trim() ||
        "Agency";
      const subject = `Invoice from ${agencyName} (sent via Likelee)`;
      const body = [
        `Hello,`,
        ``,
        `Please find attached your invoice from ${agencyName}.`,
        ``,
        `This invoice is being delivered by Likelee on behalf of ${agencyName}.`,
        `This is an automated message - do not reply.`,
        ``,
        `Invoice date: ${invoiceDate}`,
        `Due date: ${dueDate}`,
        ``,
        `For any questions regarding this invoice, please contact ${agencyName} directly.`,
      ].join("\n");

      const invoicePdfBase64 = await generateInvoicePdfBase64();

      const attachments = [
        {
          filename: invoiceNumber
            ? `invoice-${invoiceNumber}.pdf`
            : "invoice.pdf",
          content_type: "application/pdf",
          content_base64: invoicePdfBase64,
        },
        ...(await Promise.all(
          attachedFiles.map(async (f) => ({
            filename: f.name,
            content_type: f.type || "application/octet-stream",
            content_base64: await toBase64(f),
          })),
        )),
      ];

      await sendEmail({
        to,
        subject,
        body,
        attachments: attachments.length ? attachments : undefined,
      });

      setEmailSentOnce(true);

      toast({
        title: "Email sent",
        description: `Sent to ${to}`,
      });
    } catch (e: any) {
      toast({
        title: "Failed to send email",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    } finally {
      setEmailSending(false);
    }
  };

  const addLineItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        description: "",
        talent_id: "",
        date_of_service: "",
        rate_type: "day",
        quantity: "1",
        unit_price: "0",
      },
    ]);
  };

  const updateLineItem = (
    id: string,
    field:
      | "description"
      | "talent_id"
      | "date_of_service"
      | "rate_type"
      | "quantity"
      | "unit_price",
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
    );
  };

  const addExpense = () => {
    setExpenses([
      ...expenses,
      {
        id: Math.random().toString(36).substr(2, 9),
        description: "",
        amount: "0",
      },
    ]);
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const updateExpense = (
    id: string,
    field: "description" | "amount",
    value: string,
  ) => {
    setExpenses(
      expenses.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Invoice Generation
          </h2>
          <p className="text-gray-600 font-medium">
            Create and manage client invoices
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Load Template
          </Button>
          <Button
            variant="outline"
            className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="w-5 h-5" />
            Preview
          </Button>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Invoice Preview
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-medium">
              Preview is generated from the current form values.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">Invoice</p>
                <p className="text-xs text-gray-600 font-medium">
                  {invoiceNumber ||
                    "(invoice number will be generated when saved)"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600 font-medium">
                  Invoice date: {invoiceDate}
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  Due date: {dueDate}
                </p>
              </div>
            </div>
            <Card className="p-4 bg-white border border-gray-100 rounded-xl">
              <p className="text-xs font-bold text-gray-700 mb-2">Bill To</p>
              <p className="text-sm font-bold text-gray-900">
                {String((selectedClient as any)?.company || "") ||
                  "(select a client)"}
              </p>
              <p className="text-xs text-gray-600 font-medium">
                {String((selectedClient as any)?.email || "")}
              </p>
            </Card>
            <Card className="p-4 bg-white border border-gray-100 rounded-xl">
              <p className="text-xs font-bold text-gray-700 mb-2">Notes</p>
              <p className="text-xs text-gray-700 font-medium whitespace-pre-wrap">
                {notesInternal || "-"}
              </p>
            </Card>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="h-11 px-6 rounded-xl border-gray-200 font-bold"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </Button>
            <Button
              className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
              onClick={() => window.print()}
            >
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="p-6 bg-white border border-gray-100 rounded-2xl">
        <div className="space-y-6">
          <div>
            <Label className="text-sm font-bold text-gray-700 mb-3 block">
              Create Invoice From
            </Label>
            <div className="flex gap-3">
              <Button
                variant={createFrom === "booking" ? "default" : "outline"}
                className={`h-11 px-6 rounded-xl font-bold flex items-center gap-2 ${
                  createFrom === "booking"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "border-gray-200 text-gray-700"
                }`}
                onClick={() => setCreateFrom("booking")}
              >
                <Calendar className="w-5 h-5" />
                Existing Booking
              </Button>
              <Button
                variant={createFrom === "manual" ? "default" : "outline"}
                className={`h-11 px-6 rounded-xl font-bold flex items-center gap-2 ${
                  createFrom === "manual"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "border-gray-200 text-gray-700"
                }`}
                onClick={() => setCreateFrom("manual")}
              >
                <FileText className="w-5 h-5" />
                Manual Entry
              </Button>
            </div>
          </div>

          {createFrom === "booking" && (
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                Select Booking to Invoice
              </Label>
              <Select>
                <SelectTrigger className="h-12 rounded-xl border-gray-200">
                  <SelectValue placeholder="Choose a completed or confirmed booking" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="booking1">
                    Booking #2026-001 - Nike Campaign
                  </SelectItem>
                  <SelectItem value="booking2">
                    Booking #2026-002 - Adidas Shoot
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                Invoice Number <span className="text-red-500">*</span>
              </Label>
              <Input
                value={invoiceNumber || ""}
                placeholder="Generated when you save"
                readOnly
                className="h-12 rounded-xl border-gray-200"
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                Invoice Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-12 rounded-xl border-gray-200"
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                Due Date <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 flex-1"
                />
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger className="h-12 rounded-xl border-gray-200 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                    <SelectItem value="due-on-receipt">
                      Due on Receipt
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-bold text-gray-700 mb-2 block">
              Bill To (Client Information){" "}
              <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
            >
              <SelectTrigger className="h-12 rounded-xl border-gray-200">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {clients.map((c) => {
                  const id = String((c as any)?.id || "");
                  const label =
                    String((c as any)?.company || "").trim() ||
                    String((c as any)?.contact_name || "").trim() ||
                    String((c as any)?.email || "").trim() ||
                    id;
                  return (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                PO Number (Optional)
              </Label>
              <Input
                placeholder="Client purchase order number"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="h-12 rounded-xl border-gray-200"
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                Job/Project Reference (Optional)
              </Label>
              <Input
                placeholder="Project name or reference"
                value={projectReference}
                onChange={(e) => setProjectReference(e.target.value)}
                className="h-12 rounded-xl border-gray-200"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-sm font-bold text-gray-700">
                Invoice Items <span className="text-red-500">*</span>
              </Label>
              <Button
                variant="outline"
                className="h-9 px-4 rounded-lg border-gray-200 font-bold flex items-center gap-2 text-sm"
                onClick={addLineItem}
              >
                <Plus className="w-4 h-4" />
                Add Line Item
              </Button>
            </div>
            <div className="space-y-4">
              {items.map((it, idx) => (
                <Card
                  key={it.id}
                  className="p-5 bg-gray-50 border border-gray-200 rounded-xl"
                >
                  <p className="text-sm font-bold text-gray-900 mb-4">
                    Item #{idx + 1}
                  </p>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-bold text-gray-700 mb-2 block">
                        Description
                      </Label>
                      <Textarea
                        value={it.description}
                        onChange={(e) =>
                          updateLineItem(it.id, "description", e.target.value)
                        }
                        placeholder="e.g., Model services for brand photoshoot"
                        className="min-h-[80px] rounded-xl border-gray-200 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-bold text-gray-700 mb-2 block">
                          Talent
                        </Label>
                        <Select
                          value={it.talent_id}
                          onValueChange={(v) =>
                            updateLineItem(it.id, "talent_id", v)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl border-gray-200">
                            <SelectValue placeholder="Select talent" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {talents.map((t) => {
                              const id = String((t as any)?.id || "");
                              const label =
                                String((t as any)?.stage_name || "").trim() ||
                                String((t as any)?.full_name || "").trim() ||
                                String((t as any)?.name || "").trim() ||
                                id;
                              return (
                                <SelectItem key={id} value={id}>
                                  {label}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-gray-700 mb-2 block">
                          Date of Service
                        </Label>
                        <Input
                          type="date"
                          value={it.date_of_service}
                          onChange={(e) =>
                            updateLineItem(
                              it.id,
                              "date_of_service",
                              e.target.value,
                            )
                          }
                          className="h-11 rounded-xl border-gray-200"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs font-bold text-gray-700 mb-2 block">
                          Rate Type
                        </Label>
                        <Select
                          value={it.rate_type}
                          onValueChange={(v) =>
                            updateLineItem(it.id, "rate_type", v as any)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl border-gray-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="day">Day Rate</SelectItem>
                            <SelectItem value="hourly">Hourly Rate</SelectItem>
                            <SelectItem value="project">
                              Project Rate
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-gray-700 mb-2 block">
                          Quantity/Hours
                        </Label>
                        <Input
                          type="number"
                          value={it.quantity}
                          onChange={(e) =>
                            updateLineItem(it.id, "quantity", e.target.value)
                          }
                          className="h-11 rounded-xl border-gray-200"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-gray-700 mb-2 block">
                          Unit Price ({currency})
                        </Label>
                        <Input
                          type="number"
                          value={it.unit_price}
                          onChange={(e) =>
                            updateLineItem(it.id, "unit_price", e.target.value)
                          }
                          className="h-11 rounded-xl border-gray-200"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="text-sm font-bold text-gray-700">
                        Line Total:
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatMoney.format(calcLineTotal(it))}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Card className="p-5 bg-white border border-gray-100 rounded-2xl">
            <div className="flex justify-between items-center mb-4">
              <Label className="text-sm font-bold text-gray-900">
                Expenses (Optional)
              </Label>
              <Button
                variant="outline"
                onClick={addExpense}
                className="h-9 px-4 rounded-lg border-gray-200 font-bold flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Expense
              </Button>
            </div>

            {expenses.length > 0 && (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex gap-3 items-center">
                    <Input
                      placeholder="Expense description"
                      value={expense.description}
                      onChange={(e) =>
                        updateExpense(expense.id, "description", e.target.value)
                      }
                      className="h-10 rounded-xl border-gray-200 flex-1 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="0"
                      value={expense.amount}
                      onChange={(e) =>
                        updateExpense(expense.id, "amount", e.target.value)
                      }
                      className="h-10 rounded-xl border-gray-200 w-24 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExpense(expense.id)}
                      className="h-10 w-10 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-900">
                Financial Settings
              </h4>
              <div>
                <Label className="text-xs font-bold text-gray-700 mb-2 block">
                  Agency Commission (%)
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="h-11 rounded-xl border-gray-200 flex-1"
                  />
                  <span className="text-sm font-bold text-gray-600">%</span>
                </div>
                <p className="text-[10px] text-gray-500 font-medium mt-1">
                  Agency fee: $0.00 | Talent net: $0.00
                </p>
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-700 mb-2 block">
                  Currency
                </Label>
                <Select
                  value={currency.toLowerCase()}
                  onValueChange={(v) => setCurrency(v.toUpperCase())}
                >
                  <SelectTrigger className="h-11 rounded-xl border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="usd">$ US Dollar (USD)</SelectItem>
                    <SelectItem value="eur">€ Euro (EUR)</SelectItem>
                    <SelectItem value="gbp">£ British Pound (GBP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-bold text-gray-700">
                    Tax Rate (%)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={taxExempt}
                      onCheckedChange={(checked) =>
                        setTaxExempt(checked as boolean)
                      }
                      className="rounded-md w-4 h-4 border-gray-300"
                    />
                    <span className="text-xs text-gray-600 font-medium">
                      Tax Exempt
                    </span>
                  </div>
                </div>
                <Select defaultValue="0" disabled={taxExempt}>
                  <SelectTrigger className="h-11 rounded-xl border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="0">0% - No Tax</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="15">15%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-700 mb-2 block">
                  Discount
                </Label>
                <div className="flex gap-2">
                  <Select defaultValue="dollar">
                    <SelectTrigger className="h-11 rounded-xl border-gray-200 w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="dollar">$</SelectItem>
                      <SelectItem value="percent">%</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    defaultValue="0"
                    className="h-11 rounded-xl border-gray-200 flex-1"
                  />
                </div>
              </div>
            </div>

            <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl">
              <h4 className="text-sm font-bold text-gray-900 mb-4">
                Invoice Summary
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 font-medium">
                    Subtotal ({items.length} items)
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatMoney.format(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 font-medium">
                    Agency Commission ({commissionPct}%)
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    -{formatMoney.format(agencyCommissionAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-indigo-200">
                  <span className="text-sm text-gray-700 font-medium">
                    Talent Net Amount
                  </span>
                  <span className="text-sm font-bold text-green-600">
                    {formatMoney.format(talentNetAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold text-gray-900">
                    Grand Total
                  </span>
                  <span className="text-2xl font-bold text-indigo-600">
                    {formatMoney.format(grandTotal)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label className="text-xs font-bold text-gray-700 mb-2 block">
                Additional Notes (Optional)
              </Label>
              <Textarea
                placeholder="Internal notes, special terms, or additional details..."
                value={notesInternal}
                onChange={(e) => setNotesInternal(e.target.value)}
                className="min-h-[100px] rounded-xl border-gray-200 resize-none"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-700 mb-2 block">
                Payment Instructions
              </Label>
              <Textarea
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                className="min-h-[100px] rounded-xl border-gray-200 resize-none"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-gray-700 mb-2 block">
              Invoice Footer Text
            </Label>
            <Input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              className="h-11 rounded-xl border-gray-200"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-gray-700 mb-2 block">
              Attached Files (Optional)
            </Label>
            <p className="text-xs text-gray-500 font-medium mb-3">
              Attach contracts, usage agreements, or supporting documents
            </p>
            <input
              id={fileInputId}
              type="file"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] || null)}
            />
            <Button
              variant="outline"
              className="h-10 px-5 rounded-xl border-gray-200 font-bold flex items-center gap-2"
              onClick={() => {
                const el = document.getElementById(
                  fileInputId,
                ) as HTMLInputElement | null;
                el?.click();
              }}
              disabled={uploadingFile}
            >
              <Upload className="w-4 h-4" />
              {uploadingFile ? "Uploading..." : "Upload File"}
            </Button>
            {attachedFiles.length > 0 && (
              <div className="mt-3 space-y-1">
                {attachedFiles.map((f) => (
                  <p key={f.name} className="text-xs text-gray-700 font-medium">
                    {f.name}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
              onClick={saveDraft}
              disabled={!invoiceFormOk}
            >
              <Save className="w-4 h-4" />
              Save as Draft
            </Button>
            <Button
              variant="outline"
              className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
              onClick={markAsSent}
              disabled={!invoiceId}
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark as Sent
            </Button>
            <Button
              variant="outline"
              className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
              onClick={markAsPaid}
              disabled={!invoiceId}
            >
              <DollarSign className="w-4 h-4" />
              Mark as Paid
            </Button>
            <Button
              className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2"
              onClick={emailToClient}
              disabled={emailSending || !invoiceFormOk}
            >
              <Send className="w-4 h-4" />
              {emailSending
                ? "Generating PDF & sending…"
                : emailSentOnce
                  ? "Send again"
                  : "Email to Client"}
            </Button>
            <Button
              variant="outline"
              className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
              onClick={downloadPdf}
              disabled={!invoiceFormOk}
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button
              variant="outline"
              className="h-11 px-6 rounded-xl border-gray-200 font-bold flex items-center gap-2"
            >
              <Files className="w-4 h-4" />
              Duplicate
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

const InvoiceManagementView = ({
  setActiveSubTab,
  activeSubTab,
}: {
  setActiveSubTab: (tab: string) => void;
  activeSubTab: string;
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const { toast } = useToast();

  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceRows, setInvoiceRows] = useState<any[]>([]);
  const [clientRows, setClientRows] = useState<any[]>([]);

  // Filter states
  const [issueDateFrom, setIssueDateFrom] = useState("");
  const [issueDateTo, setIssueDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [currencyFilter, setCurrencyFilter] = useState("all");

  const clearAllFilters = () => {
    setIssueDateFrom("");
    setIssueDateTo("");
    setMinAmount("");
    setMaxAmount("");
    setShowOverdueOnly(false);
    setCurrencyFilter("all");
  };

  const asArray = (v: any) => {
    if (Array.isArray(v)) return v;
    if (Array.isArray(v?.data)) return v.data;
    if (Array.isArray(v?.items)) return v.items;
    if (Array.isArray(v?.rows)) return v.rows;
    return [] as any[];
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingInvoices(true);
      try {
        const [inv, clients] = await Promise.all([
          listInvoices({}),
          getAgencyClients(),
        ]);
        if (!mounted) return;
        setInvoiceRows(asArray(inv));
        setClientRows(asArray(clients));
      } catch (e: any) {
        toast({
          title: "Failed to load invoices",
          description: String(e?.message || e),
          variant: "destructive" as any,
        });
      } finally {
        if (mounted) setLoadingInvoices(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clientRows) {
      const id = String((c as any)?.id || "");
      if (!id) continue;
      const name =
        String((c as any)?.company || "").trim() ||
        String((c as any)?.contact_name || "").trim() ||
        String((c as any)?.email || "").trim();
      if (name) m.set(id, name);
    }
    return m;
  }, [clientRows]);

  const money = (cents: number, currency: string) => {
    const n = Math.round(Number(cents || 0)) / 100;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: String(currency || "USD").toUpperCase(),
      }).format(n);
    } catch {
      return `${String(currency || "USD").toUpperCase()} ${n.toFixed(2)}`;
    }
  };

  const formatDate = (s: any) => {
    const v = String(s || "");
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (s: any) => {
    const v = String(s || "");
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const normalizedInvoices = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return invoiceRows.map((inv) => {
      const invoiceId = String((inv as any)?.id || "");
      const statusRaw = String(
        (inv as any)?.status ??
          (inv as any)?.invoice_status ??
          (inv as any)?.invoice?.status ??
          "draft",
      );
      const sentAt = (inv as any)?.sent_at ?? (inv as any)?.sentAt;
      const paidAt = (inv as any)?.paid_at ?? (inv as any)?.paidAt;
      const dueDateStr = String((inv as any)?.due_date || "");
      const due = dueDateStr ? new Date(dueDateStr) : null;
      const inferredStatus = (() => {
        // If the DB has lifecycle timestamps but the status wasn't backfilled, infer it.
        if (statusRaw === "void") return "void";
        if (paidAt) return "paid";
        if (sentAt) return "sent";
        return statusRaw;
      })();

      const isOverdue =
        inferredStatus !== "paid" &&
        inferredStatus !== "void" &&
        due &&
        due < today;

      return {
        id: invoiceId,
        invoiceNumber: String((inv as any)?.invoice_number || ""),
        clientId: String((inv as any)?.client_id || ""),
        clientName:
          clientNameById.get(String((inv as any)?.client_id || "")) ||
          String((inv as any)?.bill_to_company || "") ||
          "(unknown)",
        issueDate: String((inv as any)?.invoice_date || ""),
        dueDate: dueDateStr,
        amountCents: Number((inv as any)?.total_cents || 0) || 0,
        currency: String((inv as any)?.currency || "USD"),
        status: isOverdue ? "overdue" : inferredStatus,
        sentAt: sentAt ? String(sentAt) : "",
        paidAt: paidAt ? String(paidAt) : "",
        createdAt: String((inv as any)?.created_at || ""),
        updatedAt: String((inv as any)?.updated_at || ""),
      };
    });
  }, [clientNameById, invoiceRows]);

  const filteredInvoices = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const min = Number(minAmount || "") || 0;
    const max = Number(maxAmount || "") || 0;
    const from = issueDateFrom ? new Date(issueDateFrom) : null;
    const to = issueDateTo ? new Date(issueDateTo) : null;

    const matchesCurrency = (cur: string) => {
      if (currencyFilter === "all") return true;
      return String(cur || "").toLowerCase() === currencyFilter.toLowerCase();
    };

    let out = normalizedInvoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (!matchesCurrency(inv.currency)) return false;

      if (q) {
        const hay = `${inv.invoiceNumber} ${inv.clientName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (from) {
        const d = inv.issueDate ? new Date(inv.issueDate) : null;
        if (!d || d < from) return false;
      }
      if (to) {
        const d = inv.issueDate ? new Date(inv.issueDate) : null;
        if (!d || d > to) return false;
      }

      const amount = inv.amountCents / 100;
      if (minAmount !== "" && amount < min) return false;
      if (maxAmount !== "" && max > 0 && amount > max) return false;

      if (showOverdueOnly && inv.status !== "overdue") return false;

      return true;
    });

    const byInvoice = (a: any, b: any) =>
      a.invoiceNumber.localeCompare(b.invoiceNumber);
    const byClient = (a: any, b: any) =>
      a.clientName.localeCompare(b.clientName);
    const byIssue = (a: any, b: any) =>
      new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
    const byDue = (a: any, b: any) =>
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    const byAmount = (a: any, b: any) =>
      (a.amountCents || 0) - (b.amountCents || 0);

    switch (sortBy) {
      case "oldest":
        out = out.sort(byIssue);
        break;
      case "newest":
        out = out.sort((a, b) => byIssue(b, a));
        break;
      case "due-soonest":
        out = out.sort(byDue);
        break;
      case "due-latest":
        out = out.sort((a, b) => byDue(b, a));
        break;
      case "amount-high":
        out = out.sort((a, b) => byAmount(b, a));
        break;
      case "amount-low":
        out = out.sort(byAmount);
        break;
      case "client-az":
        out = out.sort(byClient);
        break;
      case "client-za":
        out = out.sort((a, b) => byClient(b, a));
        break;
      case "invoice-asc":
        out = out.sort(byInvoice);
        break;
      case "invoice-desc":
        out = out.sort((a, b) => byInvoice(b, a));
        break;
      default:
        break;
    }

    return out;
  }, [
    currencyFilter,
    issueDateFrom,
    issueDateTo,
    maxAmount,
    minAmount,
    normalizedInvoices,
    searchTerm,
    showOverdueOnly,
    sortBy,
    statusFilter,
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "sent":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "paid":
        return "bg-green-50 text-green-700 border-green-200";
      case "overdue":
        return "bg-red-50 text-red-700 border-red-200";
      case "void":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const accountingTabs = [
    { id: "Invoice Management", label: "Invoice Management", icon: FileText },
    { id: "Invoice Generation", label: "Generate Invoice", icon: Plus },
    { id: "Payment Tracking", label: "Payment Tracking", icon: DollarSign },
    { id: "Talent Statements", label: "Talent Statements", icon: Receipt },
    { id: "Financial Reports", label: "Financial Reports", icon: BarChart2 },
    { id: "Expense Tracking", label: "Expense Tracking", icon: CreditCard },
    { id: "Connect Bank", label: "Connect Bank", icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      {/* Horizontal Tab Navigation */}
      <Card className="p-2 bg-white border border-gray-100 rounded-2xl">
        <div className="flex items-center gap-2">
          {accountingTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeSubTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Invoice Management
          </h2>
          <p className="text-gray-600 font-medium">
            View and manage all client invoices
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="h-10 px-5 rounded-xl border-gray-200 font-bold flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by invoice #, client, or talent name..."
            className="pl-10 h-10 bg-white border-gray-200 rounded-xl text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-10 bg-white border-gray-200 rounded-xl font-bold text-gray-700 text-sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="font-bold text-gray-700">
              All Status
            </SelectItem>
            <SelectItem value="draft" className="font-bold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                <span className="text-gray-900">Draft</span>
              </div>
            </SelectItem>
            <SelectItem value="sent" className="font-bold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
                <span className="text-gray-900">Sent</span>
              </div>
            </SelectItem>
            <SelectItem value="paid" className="font-bold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                <span className="text-gray-900">Paid</span>
              </div>
            </SelectItem>
            <SelectItem value="overdue" className="font-bold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                <span className="text-gray-900">Overdue</span>
              </div>
            </SelectItem>
            <SelectItem value="void" className="font-bold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-sm"></div>
                <span className="text-gray-900">Void</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 h-10 bg-white border-gray-200 rounded-xl font-bold text-gray-700 text-sm">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="newest" className="font-bold text-gray-700">
              Newest First
            </SelectItem>
            <SelectItem value="oldest" className="font-bold text-gray-700">
              Oldest First
            </SelectItem>
            <SelectItem value="due-soonest" className="font-bold text-gray-700">
              Due Date (Soonest)
            </SelectItem>
            <SelectItem value="due-latest" className="font-bold text-gray-700">
              Due Date (Latest)
            </SelectItem>
            <SelectItem value="amount-high" className="font-bold text-gray-700">
              Amount (High to Low)
            </SelectItem>
            <SelectItem value="amount-low" className="font-bold text-gray-700">
              Amount (Low to High)
            </SelectItem>
            <SelectItem value="client-az" className="font-bold text-gray-700">
              Client (A-Z)
            </SelectItem>
            <SelectItem value="client-za" className="font-bold text-gray-700">
              Client (Z-A)
            </SelectItem>
            <SelectItem value="invoice-asc" className="font-bold text-gray-700">
              Invoice # (Asc)
            </SelectItem>
            <SelectItem
              value="invoice-desc"
              className="font-bold text-gray-700"
            >
              Invoice # (Desc)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card className="p-5 bg-white border border-gray-200 rounded-2xl">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                Issue Date From
              </Label>
              <Input
                type="date"
                value={issueDateFrom}
                onChange={(e) => setIssueDateFrom(e.target.value)}
                className="h-10 rounded-xl border-gray-200 text-sm"
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                Issue Date To
              </Label>
              <Input
                type="date"
                value={issueDateTo}
                onChange={(e) => setIssueDateTo(e.target.value)}
                className="h-10 rounded-xl border-gray-200 text-sm"
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                Min Amount
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="h-10 rounded-xl border-gray-200 text-sm"
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
                Max Amount
              </Label>
              <Input
                type="number"
                placeholder="10000"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="h-10 rounded-xl border-gray-200 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={showOverdueOnly}
                  onCheckedChange={(checked) =>
                    setShowOverdueOnly(checked as boolean)
                  }
                  className="rounded-md w-4 h-4 border-gray-300"
                />
                <Label className="text-sm font-bold text-gray-700">
                  Show Overdue Only
                </Label>
              </div>
              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger className="w-48 h-10 rounded-xl border-gray-200 text-sm">
                  <SelectValue placeholder="All Currencies" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Currencies</SelectItem>
                  <SelectItem value="usd">USD</SelectItem>
                  <SelectItem value="eur">EUR</SelectItem>
                  <SelectItem value="gbp">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              onClick={clearAllFilters}
              className="h-10 px-4 rounded-xl font-bold text-gray-700 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear All Filters
            </Button>
          </div>
        </Card>
      )}

      <div className="text-sm text-gray-700 font-bold">
        Showing{" "}
        <span className="font-bold text-gray-900">
          {filteredInvoices.length} of {normalizedInvoices.length}
        </span>{" "}
        invoices
      </div>

      <Card className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left">
                  <Checkbox className="rounded-md w-4 h-4 border-gray-300" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Client Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Issue Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-3">
                    <Checkbox className="rounded-md w-4 h-4 border-gray-300" />
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm font-bold text-gray-900">
                      {invoice.invoiceNumber}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm font-bold text-indigo-600">
                      {invoice.clientName}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm text-gray-700 font-bold">
                      {formatDate(invoice.issueDate)}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm text-gray-700 font-bold">
                      {formatDate(invoice.dueDate)}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm font-bold text-gray-900">
                      {money(invoice.amountCents, invoice.currency)}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs font-bold px-3 py-1 rounded-lg capitalize ${getStatusColor(invoice.status)}`}
                    >
                      {invoice.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        title="View Invoice"
                        onClick={() => {
                          if (!invoice.id) return;
                          setActiveSubTab("Invoice Generation");
                          navigate({
                            search: `?invoiceId=${encodeURIComponent(invoice.id)}`,
                          });
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
                        title="Edit Invoice"
                        onClick={() => {
                          if (!invoice.id) return;
                          setActiveSubTab("Invoice Generation");
                          navigate({
                            search: `?invoiceId=${encodeURIComponent(invoice.id)}`,
                          });
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
                        title="Download PDF"
                        onClick={() => {
                          if (!invoice.id) return;
                          setActiveSubTab("Invoice Generation");
                          navigate({
                            search: `?invoiceId=${encodeURIComponent(invoice.id)}`,
                          });
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowPaymentHistory(true);
                            }}
                            className="font-bold text-gray-700 cursor-pointer"
                          >
                            <History className="w-4 h-4 mr-2" />
                            Payment History
                          </DropdownMenuItem>
                          <DropdownMenuItem className="font-bold text-gray-700 cursor-pointer">
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payment History Modal */}
      <Dialog open={showPaymentHistory} onOpenChange={setShowPaymentHistory}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Payment History
            </DialogTitle>
            <p className="text-sm text-gray-600 font-medium">
              Invoice #{selectedInvoice?.invoiceNumber}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs font-bold text-gray-700 mb-1">
                  Invoice Total
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {money(
                    Number((selectedInvoice as any)?.amountCents || 0) || 0,
                    String((selectedInvoice as any)?.currency || "USD"),
                  )}
                </p>
              </Card>
              <Card className="p-4 bg-green-50 border border-green-100 rounded-xl">
                <p className="text-xs font-bold text-gray-700 mb-1">
                  Total Paid
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {money(
                    ((selectedInvoice as any)?.paidAt
                      ? Number((selectedInvoice as any)?.amountCents || 0) || 0
                      : 0) || 0,
                    String((selectedInvoice as any)?.currency || "USD"),
                  )}
                </p>
              </Card>
              <Card className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                <p className="text-xs font-bold text-gray-700 mb-1">
                  Remaining Balance
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {money(
                    Math.max(
                      0,
                      (Number((selectedInvoice as any)?.amountCents || 0) ||
                        0) -
                        ((selectedInvoice as any)?.paidAt
                          ? Number(
                              (selectedInvoice as any)?.amountCents || 0,
                            ) || 0
                          : 0),
                    ),
                    String((selectedInvoice as any)?.currency || "USD"),
                  )}
                </p>
              </Card>
            </div>

            {/* Payment Transactions */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-3">
                Payment Transactions
              </h4>
              {(() => {
                const inv: any = selectedInvoice || {};
                const currency = String(inv.currency || "USD");
                const events: Array<{
                  key: string;
                  kind: "paid" | "sent" | "created" | "void";
                  at: string;
                }> = [];

                const status = String(inv.status || "").toLowerCase();
                if (String(inv.createdAt || ""))
                  events.push({
                    key: "created",
                    kind: "created",
                    at: String(inv.createdAt),
                  });
                if (String(inv.sentAt || ""))
                  events.push({
                    key: "sent",
                    kind: "sent",
                    at: String(inv.sentAt),
                  });
                if (String(inv.paidAt || ""))
                  events.push({
                    key: "paid",
                    kind: "paid",
                    at: String(inv.paidAt),
                  });
                if (status === "void")
                  events.push({
                    key: "void",
                    kind: "void",
                    at: String(inv.updatedAt || inv.createdAt || ""),
                  });

                const payments = events.filter((e) => e.kind === "paid");
                if (!payments.length) {
                  return (
                    <Card className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="text-sm font-bold text-gray-900">
                        No payments recorded
                      </p>
                      <p className="text-xs text-gray-600 font-medium">
                        This invoice has not been marked as paid.
                      </p>
                    </Card>
                  );
                }

                return payments.map((p, idx) => (
                  <Card
                    key={p.key}
                    className="p-4 bg-green-50 border border-green-100 rounded-xl"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              Payment #{idx + 1}
                            </p>
                            <p className="text-xs text-gray-600 font-medium">
                              {formatDateTime(p.at)}
                            </p>
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            {money(Number(inv.amountCents || 0) || 0, currency)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 font-medium">
                          Invoice marked as paid
                        </p>
                      </div>
                    </div>
                  </Card>
                ));
              })()}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="h-10 px-5 rounded-xl border-gray-200 font-bold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export History
            </Button>
            <Button
              onClick={() => setShowPaymentHistory(false)}
              className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TALENT_DATA = [
  {
    id: "aaron",
    name: "Aaron",
    role: "Model",
    status: "pending",
    consent: "missing",
    aiUsage: [],
    followers: "2,100",
    followersVal: 2100,
    assets: 19,
    brand: "—",
    expiry: "—",
    earnings: "$0",
    earningsVal: 0,
    projected: "$0",
    projectedVal: 0,
    img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/86e331be1_Screenshot2025-10-29at63806PM.png",
  },
  {
    id: "carla",
    name: "Carla",
    role: "Model, Creator",
    status: "active",
    consent: "complete",
    aiUsage: ["Video", "Image"],
    followers: "53,400",
    followersVal: 53400,
    assets: 61,
    brand: "Reformation",
    expiry: "11/8/2025",
    earnings: "$6,800",
    earningsVal: 6800,
    projected: "$8,200",
    projectedVal: 8200,
    isVerified: true,
    img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/cf591ec97_Screenshot2025-10-29at63544PM.png",
  },
  {
    id: "clemence",
    name: "Clemence",
    role: "Model",
    status: "active",
    consent: "complete",
    aiUsage: ["Image"],
    followers: "32,200",
    followersVal: 32200,
    assets: 47,
    brand: "COS",
    expiry: "8/28/2025",
    earnings: "$5,400",
    earningsVal: 5400,
    projected: "$6,200",
    projectedVal: 6200,
    isVerified: true,
    img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/ee3aae03f_Screenshot2025-10-29at63651PM.png",
  },
  {
    id: "emma",
    name: "Emma",
    role: "Model, Creator",
    status: "active",
    consent: "complete",
    aiUsage: ["Video", "Image"],
    followers: "42,300",
    followersVal: 42300,
    assets: 38,
    brand: "Glossier",
    expiry: "8/15/2025",
    earnings: "$3,200",
    earningsVal: 3200,
    projected: "$4,100",
    projectedVal: 4100,
    isVerified: true,
    img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/5d413193e_Screenshot2025-10-29at63349PM.png",
  },
  {
    id: "julia",
    name: "Julia",
    role: "Model, Voice",
    status: "active",
    consent: "expiring",
    aiUsage: ["Video", "Image", "Voice"],
    followers: "5,700",
    followersVal: 5700,
    assets: 54,
    brand: "& Other Stories",
    expiry: "2/15/2025",
    earnings: "$5,200",
    earningsVal: 5200,
    projected: "$6,500",
    projectedVal: 6500,
    isVerified: true,
    img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/c5a5c61e4_Screenshot2025-10-29at63512PM.png",
  },
  {
    id: "lina",
    name: "Lina",
    role: "Model",
    status: "active",
    consent: "complete",
    aiUsage: ["Image"],
    followers: "12,400",
    followersVal: 12400,
    assets: 28,
    brand: "Mango",
    expiry: "6/12/2025",
    earnings: "$2,800",
    earningsVal: 2800,
    projected: "$3,500",
    projectedVal: 3500,
    isVerified: true,
    img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/ac71e274e_Screenshot2025-10-29at63715PM.png",
  },
  {
    id: "luisa",
    name: "Luisa",
    role: "Model",
    status: "active",
    consent: "complete",
    aiUsage: ["Video", "Image"],
    followers: "28,600",
    followersVal: 28600,
    assets: 41,
    brand: "Zara",
    expiry: "9/30/2025",
    earnings: "$4,100",
    earningsVal: 4100,
    projected: "$5,000",
    projectedVal: 5000,
    isVerified: true,
    img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/dfe7c47ac_Screenshot2025-10-29at63612PM.png",
  },
  {
    id: "milan",
    name: "Milan",
    role: "Model, Actor",
    status: "active",
    consent: "complete",
    aiUsage: ["Video", "Image"],
    followers: "8,200",
    followersVal: 8200,
    assets: 31,
    brand: "Carhartt WIP",
    expiry: "10/15/2025",
    earnings: "$2,400",
    earningsVal: 2400,
    projected: "$3,100",
    projectedVal: 3100,
    isVerified: true,
    img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/b0ae64ffa_Screenshot2025-10-29at63451PM.png",
  },
  {
    id: "sergine",
    name: "Sergine",
    role: "Model, Creator",
    status: "active",
    consent: "complete",
    aiUsage: ["Video", "Image"],
    followers: "15,800",
    followersVal: 15800,
    assets: 45,
    brand: "Ganni",
    expiry: "12/20/2025",
    earnings: "$3,600",
    earningsVal: 3600,
    projected: "$4,400",
    projectedVal: 4400,
    isVerified: true,
    img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/7b92ca646_Screenshot2025-10-29at63428PM.png",
    engagement: "3.8%",
    campaigns: 5,
  },
  {
    id: "matt",
    name: "Matt",
    role: "Model",
    status: "active",
    consent: "complete",
    aiUsage: ["Image"],
    followers: "12,100",
    followersVal: 12100,
    assets: 34,
    brand: "Zara",
    expiry: "12/15/2025",
    earnings: "$3,600",
    earningsVal: 3600,
    projected: "$4,500",
    projectedVal: 4500,
    isVerified: true,
    img: "https://i.pravatar.cc/150?u=Matt",
    engagement: "4.5%",
    campaigns: 6,
  },
];

// Add tier/engagement to existing ones and match counts to screenshots (1, 3, 1, 0 + others)
// Actually to match summary cards (1, 3, 1, 0) I should probably only use those 5 for that specific view
// OR assign the others to "Growth" as well but the summary cards specifically say "1 talent" for Growth in the screenshot.
// I'll stick to the screenshots' counts for the summary but show all talent in their respective lists if they fit.
// Wait, the screenshot summary says "1 talent" for Growth but I have many potentials.
// I'll make the summary counts dynamic but I'll try to match the screenshot "look" by default.
TALENT_DATA.forEach((t: any) => {
  // Clear any pre-assigned tiers to ensure 100% control over the count
  t.tier = undefined;

  if (t.id === "carla") {
    t.tier = "Premium";
    t.engagement = "7.1%";
    t.campaigns = 13;
  } else if (t.id === "matt") {
    t.tier = "Core";
    t.engagement = "4.5%";
    t.campaigns = 6;
    t.sortOrder = 1;
  } else if (t.id === "emma") {
    t.tier = "Core";
    t.engagement = "4.0%";
    t.campaigns = 6;
    t.sortOrder = 2;
  } else if (t.id === "sergine") {
    t.tier = "Core";
    t.engagement = "3.8%";
    t.campaigns = 5;
    t.sortOrder = 3;
  } else if (t.id === "lina") {
    t.tier = "Growth";
    t.engagement = "3.5%";
    t.campaigns = 4;
  }
  // All other talent will NOT have a tier assigned to match the 1-3-1-0 count
});

const ANALYTICS_CAMPAIGN_STATUS = [
  { name: "In Progress", value: 15, color: "#111827" },
  { name: "Ready to Launch", value: 5, color: "#9ca3af" },
  { name: "Completed", value: 3, color: "#374151" },
];

const ANALYTICS_PERFORMANCE_TRENDS = [
  { month: "Jul", earnings: 28500, campaigns: 10, usages: 60 },
  { month: "Aug", earnings: 32000, campaigns: 12, usages: 65 },
  { month: "Sep", earnings: 30500, campaigns: 11, usages: 62 },
  { month: "Oct", earnings: 35000, campaigns: 14, usages: 68 },
  { month: "Nov", earnings: 37700, campaigns: 15, usages: 73 },
];

const ANALYTICS_AI_USAGE_TYPE = [
  { name: "Image", value: 45, color: "#60a5fa" },
  { name: "Video", value: 38, color: "#8b5cf6" },
  { name: "Voice", value: 17, color: "#ec4899" },
];

const ANALYTICS_CONSENT_STATUS = [
  { name: "Complete", value: 80, color: "#10b981" },
  { name: "Missing", value: 10, color: "#f59e0b" },
  { name: "Expiring", value: 10, color: "#facc15" },
];

const ROSTER_INSIGHTS_DATA = [
  { name: "Carla", earnings: 6800, projected: 8200 },
  { name: "Clemence", earnings: 5400, projected: 6200 },
  { name: "Julia", earnings: 5200, projected: 6500 },
  { name: "Luisa", earnings: 4100, projected: 5100 },
  { name: "Milan", earnings: 4100, projected: 5200 },
  { name: "Matt", earnings: 3600, projected: 4300 },
  { name: "Emma", earnings: 3200, projected: 4100 },
  { name: "Sergine", earnings: 2800, projected: 3500 },
  { name: "Lina", earnings: 2400, projected: 3000 },
];

const CLIENTS_PERFORMANCE_DATA = [
  { name: "L'Oreal", budget: 45000, color: "#6366f1", roi: "3.2x" }, // Indigo
  { name: "Nike", budget: 28500, color: "#8b5cf6", roi: "2.8x" }, // Violet
  { name: "Zara", budget: 15000, color: "#f59e0b", roi: "2.5x" }, // Amber
  { name: "Glossier", budget: 12500, color: "#ec4899", roi: "3.5x" }, // Rose
];

// --- View Components ---

const PerformanceTiersView = ({ onBack }: { onBack: () => void }) => {
  const tiers = [
    {
      id: "Premium",
      label: "Tier 1 - Premium",
      icon: Trophy,
      color: "border-yellow-400",
      textColor: "text-yellow-500",
      bg: "bg-[#FFFEF0]",
      iconBg: "bg-[#FEFCE8]",
      desc: "Top 10% earners with high activity",
      avgEarnings: "$6,800",
      freq: "13.0",
      capacity: "10%",
    },
    {
      id: "Core",
      label: "Tier 2 - Core",
      icon: TrendingUp,
      color: "border-blue-400",
      textColor: "text-blue-500",
      bg: "bg-[#F5F9FF]",
      iconBg: "bg-[#EFF6FF]",
      desc: "Mid-tier earners with consistent bookings",
      avgEarnings: "$3,200",
      freq: "6.0",
      capacity: "30%",
    },
    {
      id: "Growth",
      label: "Tier 3 - Growth",
      icon: Target,
      color: "border-green-400",
      textColor: "text-green-500",
      bg: "bg-[#F5FFF8]",
      iconBg: "bg-[#F0FDF4]",
      desc: "Newer or emerging talent",
      avgEarnings: "$2,400",
      freq: "4.0",
      capacity: "10%",
    },
    {
      id: "Inactive",
      label: "Tier 4 - Inactive",
      icon: AlertCircle,
      color: "border-gray-300",
      textColor: "text-gray-500",
      bg: "bg-gray-50",
      iconBg: "bg-gray-100",
      desc: "No activity in 60+ days",
      avgEarnings: "$0",
      freq: "0.0",
      capacity: "0%",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Performance Tiers
          </h1>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Talent segmented by earnings and activity levels
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2 border-gray-300 font-bold text-gray-700 bg-white shadow-sm"
        >
          <TrendingUp className="w-4 h-4 text-gray-400" /> View All Roster
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => {
          const count = TALENT_DATA.filter(
            (t: any) => t.tier === tier.id,
          ).length;
          return (
            <Card
              key={tier.id}
              className={`p-6 bg-white border-2 ${tier.color} shadow-sm rounded-xl hover:shadow-md transition-shadow`}
            >
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <tier.icon className={`w-10 h-10 ${tier.textColor}`} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  {tier.label}
                </h3>
                <div className="flex items-baseline gap-1.5 mt-auto">
                  <span className="text-3xl font-bold text-gray-900">
                    {count}
                  </span>
                  <span className="text-xs text-gray-500 font-medium pb-1">
                    talent
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detail Sections */}
      <div className="space-y-12">
        {tiers.map((tier) => {
          const talentInTier = TALENT_DATA.filter(
            (t: any) => t.tier === tier.id,
          );
          return (
            <div
              key={tier.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-8"
            >
              {/* Tier Info Header */}
              <div className="flex items-center gap-4 mb-8">
                <div
                  className={`p-4 rounded-xl ${tier.id === "Premium" ? "bg-[#FAFAF5]" : tier.id === "Core" ? "bg-[#FAFCFF]" : tier.id === "Growth" ? "bg-[#FAFFFC]" : "bg-gray-50"}`}
                >
                  <tier.icon className={`w-6 h-6 ${tier.textColor}`} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">
                    {tier.label}
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">
                    {tier.desc}
                  </p>
                </div>
              </div>

              {/* Tier Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div
                  className={`p-6 rounded-2xl border ${tier.id === "Premium" ? "bg-[#FFFEF0] border-yellow-50" : tier.id === "Core" ? "bg-[#F5F9FF] border-blue-50" : tier.id === "Growth" ? "bg-[#F5FFF8] border-green-50" : "bg-gray-50 border-gray-100"}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <DollarSign className={`w-4 h-4 ${tier.textColor}`} />
                    </div>
                    <span className="text-xs font-bold text-gray-500">
                      Avg Monthly Earnings
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {tier.avgEarnings}
                  </div>
                </div>

                <div
                  className={`p-6 rounded-2xl border ${tier.id === "Premium" ? "bg-[#FFFEF0] border-yellow-50" : tier.id === "Core" ? "bg-[#F5F9FF] border-blue-50" : tier.id === "Growth" ? "bg-[#F5FFF8] border-green-50" : "bg-gray-50 border-gray-100"}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <FileText className={`w-4 h-4 ${tier.textColor}`} />
                    </div>
                    <span className="text-xs font-bold text-gray-500">
                      Avg Booking Frequency
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {tier.freq}
                  </div>
                </div>

                <div
                  className={`p-6 rounded-2xl border ${tier.id === "Premium" ? "bg-[#FFFEF0] border-yellow-50" : tier.id === "Core" ? "bg-[#F5F9FF] border-blue-50" : tier.id === "Growth" ? "bg-[#F5FFF8] border-green-50" : "bg-gray-50 border-gray-100"}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Users className={`w-4 h-4 ${tier.textColor}`} />
                    </div>
                    <span className="text-xs font-bold text-gray-500">
                      Total Talent
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {talentInTier.length}
                  </div>
                </div>
              </div>

              {/* Recommendation Box */}
              <div className="bg-[#F5F8FF] border border-[#E0E7FF] p-5 rounded-2xl flex items-start gap-4 mb-8">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border-[3px] border-[#C7D2FE] flex-shrink-0 mt-0.5 shadow-sm">
                  <svg
                    className="w-4 h-4 text-indigo-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1">
                    Agency Recommendation
                  </h4>
                  <p className="text-[13px] text-[#4F46E5] font-semibold leading-snug">
                    {tier.id === "Premium" &&
                      "Prioritize for high-value campaigns. Consider exclusive partnerships."}
                    {tier.id === "Core" &&
                      "Stable performers. Focus on increasing campaign frequency and average deal value."}
                    {tier.id === "Growth" &&
                      "Invest in portfolio development. Increase brand exposure and campaign opportunities."}
                    {tier.id === "Inactive" &&
                      "Requires immediate action. Consider portfolio refresh, marketing push, or roster review."}
                  </p>
                </div>
              </div>

              {/* Talent List in Tier */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-6">
                  Talent in This Tier
                </h4>
                <div className="space-y-3">
                  {talentInTier.length > 0 ? (
                    [...talentInTier]
                      .sort(
                        (a: any, b: any) =>
                          (a.sortOrder || 99) - (b.sortOrder || 99),
                      )
                      .map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-4 p-5 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group"
                        >
                          <img
                            src={t.img}
                            alt={t.name}
                            className="w-14 h-14 rounded-2xl object-cover bg-gray-50 shadow-sm border border-gray-50"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900 text-[15px]">
                                {t.name}
                              </span>
                              <div className="bg-green-100 p-0.5 rounded-full">
                                <svg
                                  className="w-2.5 h-2.5 text-green-600"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                              <span className="text-gray-900 font-bold">
                                {t.earnings}/mo
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="flex items-center gap-1 group-hover:text-indigo-500 transition-colors">
                                <TrendingUp className="w-3.5 h-3.5" />{" "}
                                {t.campaigns} campaigns
                              </span>
                              <span className="text-gray-300">•</span>
                              <span>{t.engagement} engagement</span>
                            </div>
                          </div>
                          <div className="hidden md:flex flex-col items-center gap-2 w-48 mr-6">
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                              <div
                                className="h-full bg-gray-900 rounded-full"
                                style={{
                                  width:
                                    (t as any).id === "carla"
                                      ? "85%"
                                      : (t as any).tier === "Core"
                                        ? "65%"
                                        : (t as any).tier === "Growth"
                                          ? "45%"
                                          : "10%",
                                }}
                              ></div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 font-bold text-gray-700 bg-white border-gray-200 px-6 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                          >
                            View
                          </Button>
                        </div>
                      ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50/30 rounded-2xl border border-dashed border-gray-200">
                      <div className="p-6 bg-white rounded-full mb-4 shadow-sm">
                        <Users className="w-12 h-12 text-gray-100" />
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                        No talent assigned to
                        <br />
                        this performance tier yet
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ScoutingHubView = ({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) => {
  const [isProspectModalOpen, setIsProspectModalOpen] = useState(false);
  const [prospectToEdit, setProspectToEdit] = useState<ScoutingProspect | null>(
    null,
  );
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<ScoutingEvent | null>(null);

  const tabs = [
    "Prospect Pipeline",
    "Social Discovery",
    "Marketplace",
    "Scouting Map",
    "Plan Trip",
    "Submissions",
    "Open Calls",
    "Analytics",
  ];

  return (
    <div className="space-y-8 max-w-8xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Scouting Hub
          </h1>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Discover, track, and manage talent prospects
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2 border-gray-300 font-bold text-gray-700 bg-white shadow-sm rounded-lg h-9 text-sm"
            onClick={() => {
              setProspectToEdit(null);
              setIsProspectModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 text-gray-400" /> Add Prospect
          </Button>
          <Button
            variant="default"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-sm rounded-lg h-9 text-sm"
            onClick={() => {
              setEventToEdit(null);
              setIsEventModalOpen(true);
            }}
          >
            <Calendar className="w-4 h-4" /> Create Event
          </Button>
          <Button
            onClick={() => setActiveTab("Plan Trip")}
            className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" /> Plan Scouting Trip
          </Button>
        </div>
      </div>

      <div className="bg-gray-100 p-0.5 rounded-lg inline-flex gap-0.5 overflow-x-auto w-full">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={`mt-8 w-full`}>
        {activeTab === "Prospect Pipeline" && (
          <ProspectPipelineTab
            onAddProspect={() => {
              setProspectToEdit(null);
              setIsProspectModalOpen(true);
            }}
            onEditProspect={(prospect) => {
              setProspectToEdit(prospect);
              setIsProspectModalOpen(true);
            }}
          />
        )}
        {activeTab === "Social Discovery" && <SocialDiscoveryTab />}
        {activeTab === "Marketplace" && <MarketplaceTab />}
        <div className={activeTab === "Scouting Map" ? "block" : "hidden"}>
          <ScoutingMapTab
            onEditEvent={(event) => {
              setEventToEdit(event);
              setIsEventModalOpen(true);
            }}
            onViewProspect={(prospect) => {
              setProspectToEdit(prospect);
              setIsProspectModalOpen(true);
            }}
            onAddEvent={() => {
              setEventToEdit(null);
              setIsEventModalOpen(true);
            }}
            isVisible={activeTab === "Scouting Map"}
          />
        </div>
        <div className={activeTab === "Plan Trip" ? "block" : "hidden"}>
          <ScoutingTrips />
        </div>
        {activeTab === "Submissions" && <SubmissionsTab />}
        {activeTab === "Open Calls" && (
          <OpenCallsTab
            onCreateEvent={() => {
              setEventToEdit(null);
              setIsEventModalOpen(true);
            }}
            onEditEvent={(event) => {
              setEventToEdit(event);
              setIsEventModalOpen(true);
            }}
          />
        )}
        {activeTab === "Analytics" && <ScoutingAnalyticsTab />}
      </div>
      <ProspectModalAlt
        open={isProspectModalOpen}
        onOpenChange={setIsProspectModalOpen}
        prospect={prospectToEdit}
      />

      <ScoutingEventModal
        open={isEventModalOpen}
        onOpenChange={(open) => {
          setIsEventModalOpen(open);
          if (!open) setEventToEdit(null);
        }}
        eventToEdit={eventToEdit}
        onSaved={async () => {
          await queryClient.invalidateQueries({
            queryKey: ["scouting-events"],
          });
        }}
      />
    </div>
  );
};

const ProspectDetailsSheet = ({
  prospect,
  onClose,
  onEdit,
}: {
  prospect: ScoutingProspect | null;
  onClose: () => void;
  onEdit: (prospect: ScoutingProspect) => void;
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!prospect) return null;

  const handleStatusChange = async (newStatus: string) => {
    try {
      await scoutingService.updateProspect(prospect.id, {
        status: newStatus as any,
      });
      await queryClient.invalidateQueries({ queryKey: ["prospects"] });
      toast({
        title: "Status Updated",
        description: `Prospect status changed to ${STATUS_MAP[newStatus as keyof typeof STATUS_MAP] || newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={!!prospect} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[650px] sm:max-w-none bg-white p-0 flex flex-col">
        <SheetHeader className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 bg-gray-50/70 border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-gray-600">
                  Status
                </Label>
                <Badge
                  className={`capitalize border px-3 py-1 ${STATUS_COLORS[prospect.status] || "bg-gray-100 text-gray-700 border-gray-200"}`}
                >
                  {STATUS_MAP[prospect.status] || prospect.status}
                </Badge>
              </div>
              <Select
                onValueChange={handleStatusChange}
                defaultValue={prospect.status}
                disabled={["offer_sent", "signed", "declined"].includes(
                  prospect.status,
                )}
              >
                <SelectTrigger className="w-full h-10 text-sm font-semibold mt-2 bg-white">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS[prospect.status] || "bg-gray-400"}`}
                    ></span>
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="new_lead"
                    className="text-sm font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS.new_lead}`}
                      ></span>
                      <span>{STATUS_MAP.new_lead}</span>
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="in_contact"
                    className="text-sm font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS.in_contact}`}
                      ></span>
                      <span>{STATUS_MAP.in_contact}</span>
                    </div>
                  </SelectItem>
                  <SelectGroup>
                    <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                      Test Shoot
                    </SelectLabel>
                    <SelectItem
                      value="test_shoot_pending"
                      className="text-sm font-semibold bg-gray-50/50"
                    >
                      <div className="flex items-center gap-2 pl-6">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS.test_shoot_pending}`}
                        ></span>
                        <span>Pending</span>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="test_shoot_success"
                      className="text-sm font-semibold bg-gray-50/50"
                    >
                      <div className="flex items-center gap-2 pl-6">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS.test_shoot_success}`}
                        ></span>
                        <span>Success</span>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="test_shoot_failed"
                      className="text-sm font-semibold bg-gray-50/50"
                    >
                      <div className="flex items-center gap-2 pl-6">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS.test_shoot_failed}`}
                        ></span>
                        <span>Failed</span>
                      </div>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Info */}
          <div className="space-y-6 border-b pb-6">
            <div className="flex items-start space-x-6">
              <div
                className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border cursor-pointer hover:bg-gray-200 transition-colors group relative"
                onClick={() => onEdit(prospect)}
              >
                <User className="w-12 h-12 text-gray-400 group-hover:text-gray-500" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1 pt-2">
                <div className="flex justify-between items-start">
                  <h2 className="text-3xl font-bold text-gray-900">
                    {prospect.full_name}
                  </h2>
                  {prospect.status === "test_shoot_success" ? (
                    <Button
                      onClick={() =>
                        (window.location.href = `/scoutingoffers?prospectId=${prospect.id}`)
                      }
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Send Offer
                    </Button>
                  ) : ["offer_sent", "opened", "signed", "declined"].includes(
                      prospect.status,
                    ) ? (
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() =>
                          (window.location.href = `/scoutingoffers?prospectId=${prospect.id}`)
                        }
                        className="bg-white hover:bg-gray-50 border text-gray-700 font-bold h-9 px-4 rounded-lg shadow-sm flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        View Offers
                      </Button>
                      {prospect.status === "signed" && (
                        <Button
                          onClick={() =>
                            navigate("/addtalent", { state: { prospect } })
                          }
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-4 rounded-lg shadow-sm flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Talent
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {prospect.categories?.map((cat) => (
                    <Badge key={cat} variant="outline" className="font-medium">
                      {cat}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-1 mt-3 text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${i < (prospect.rating || 0) ? "fill-current" : "text-gray-300"}`}
                    />
                  ))}
                  <span className="text-sm text-gray-500 ml-1">
                    ({prospect.rating || 0}/5 rating)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Section title="Contact Information">
            <InfoRow icon={Mail} text={prospect.email} />
            <InfoRow icon={Phone} text={prospect.phone} />
            <InfoRow
              icon={Instagram}
              text={prospect.instagram_handle}
              subtext={`(${prospect.instagram_followers?.toLocaleString()} followers)`}
            />
          </Section>

          <Section title="Discovery Details">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm p-4 bg-gray-50/70 rounded-xl border">
              <DetailItem label="Source" value={prospect.source} />
              <DetailItem
                label="Date"
                value={new Date(prospect.discovery_date).toLocaleDateString()}
              />
              <DetailItem
                label="Location"
                value={prospect.discovery_location}
              />
              <DetailItem label="Referred By" value={prospect.referred_by} />
            </div>
          </Section>

          <Section title="Assignment">
            <div className="p-4 bg-gray-50/70 rounded-xl border font-medium text-gray-800">
              {prospect.assigned_agent_name || "Not Assigned"}
            </div>
          </Section>

          <Section title="Internal Notes">
            <div className="p-4 bg-gray-50/70 rounded-xl border text-gray-700 text-sm whitespace-pre-wrap min-h-[60px]">
              {prospect.notes || (
                <span className="text-gray-500 italic">
                  No internal notes added.
                </span>
              )}
            </div>
          </Section>

          <Section title="Social Metrics">
            <div className="grid grid-cols-2 gap-4">
              <MetricBox
                label="Instagram Followers"
                value={prospect.instagram_followers?.toLocaleString() || "N/A"}
              />
              <MetricBox
                label="Engagement Rate"
                value={`${prospect.engagement_rate || "N/A"}%`}
              />
            </div>
          </Section>

          <Button
            className="w-full h-11 text-base font-bold flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
            onClick={() => onEdit(prospect)}
          >
            <Pencil className="w-4 h-4" /> Edit Prospect
          </Button>
          <Button
            variant="outline"
            className="w-full h-11 text-base flex items-center gap-2"
            onClick={() => {
              if (prospect.email) {
                window.location.href = `mailto:${prospect.email}`;
              } else {
                toast({
                  title: "No Email Found",
                  description:
                    "This prospect does not have an email address associated with them.",
                  variant: "destructive",
                });
              }
            }}
          >
            <Send className="w-4 h-4" /> Send Email
          </Button>
          <Button
            variant="outline"
            className="w-full h-11 text-base flex items-center gap-2"
            onClick={() => window.open("https://calendar.google.com", "_blank")}
          >
            <Calendar className="w-4 h-4" /> Schedule Meeting
          </Button>
          <Button
            variant="outline"
            className="w-full h-11 text-base flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" /> Delete Prospect
          </Button>
          <p className="text-xs text-gray-400 text-center pt-2">
            Added {new Date(prospect.created_at).toLocaleDateString()} | Last
            updated {new Date(prospect.updated_at).toLocaleDateString()}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-3">
    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
      <MapPin className="w-4 h-4 text-gray-400" /> {title}
    </h3>
    {children}
  </div>
);

const InfoRow = ({
  icon: Icon,
  text,
  subtext,
}: {
  icon: React.ElementType;
  text?: string | null;
  subtext?: string;
}) => (
  <div className="flex items-center justify-between p-3.5 bg-gray-50/70 rounded-xl border">
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-gray-400" />
      <span className="font-medium text-gray-800">{text || "-"}</span>
      {subtext && <span className="text-xs text-gray-500">{subtext}</span>}
    </div>
    <LinkIcon className="w-4 h-4 text-gray-400 cursor-pointer hover:text-indigo-600" />
  </div>
);

const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) => (
  <div>
    <div className="text-xs text-gray-500">{label}</div>
    <div className="font-semibold text-gray-800">{value || "-"}</div>
  </div>
);

const MetricBox = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="p-4 bg-gray-50/70 rounded-xl border">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
  </div>
);

const ProspectPipelineTab = ({
  onAddProspect,
  onEditProspect,
}: {
  onAddProspect: () => void;
  onEditProspect: (prospect: ScoutingProspect) => void;
}) => {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedProspect, setSelectedProspect] =
    useState<ScoutingProspect | null>(null);
  const { data: prospects, isLoading } = useQuery({
    queryKey: ["prospects", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const agencyId = await scoutingService.getUserAgencyId();
      if (!agencyId) return [];
      return scoutingService.getProspects(agencyId);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (selectedProspect && prospects) {
      const updated = prospects.find((p) => p.id === selectedProspect.id);
      if (updated) setSelectedProspect(updated);
    }
  }, [prospects]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const stats = [
    {
      label: "New Leads",
      count: prospects?.filter((p) => p.status === "new_lead").length || 0,
      color: "border-blue-200 bg-blue-50/30",
    },
    {
      label: "In Contact",
      count: prospects?.filter((p) => p.status === "in_contact").length || 0,
      color: "border-yellow-200 bg-yellow-50/30",
    },
    {
      label: "Test Shoots",
      count:
        prospects?.filter((p) => p.status.startsWith("test_shoot_")).length ||
        0,
      color: "border-purple-200 bg-purple-50/30",
    },
    {
      label: "Offers Sent",
      count:
        prospects?.filter((p) =>
          ["offer_sent", "opened", "signed", "declined"].includes(p.status),
        ).length || 0,
      color: "border-green-200 bg-green-50/30",
    },
  ];

  const hasActiveFilters =
    debouncedSearch || statusFilter !== "all" || sourceFilter !== "all";

  const clearFilters = () => {
    setSearchInput("");
    setStatusFilter("all");
    setSourceFilter("all");
  };

  return (
    <div className="space-y-6">
      <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-3xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h2 className="text-xl font-bold text-gray-900">Prospect Pipeline</h2>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search prospects..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 h-10 border-gray-200 bg-white"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-10 border-gray-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_MAP).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[140px] h-10 border-gray-200">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="street">Street Scouting</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="website">Website</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="h-10 text-red-600 hover:text-red-800 font-bold"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            {debouncedSearch && (
              <Badge
                variant="secondary"
                className="bg-indigo-50 text-indigo-700 border-indigo-200 px-3 py-1 flex items-center gap-2"
              >
                Search: "{debouncedSearch}"
                <button
                  onClick={() => setSearchInput("")}
                  className="hover:text-indigo-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {statusFilter !== "all" && (
              <Badge
                variant="secondary"
                className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 flex items-center gap-2"
              >
                Status: {STATUS_MAP[statusFilter]}
                <button
                  onClick={() => setStatusFilter("all")}
                  className="hover:text-blue-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {sourceFilter !== "all" && (
              <Badge
                variant="secondary"
                className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-1 flex items-center gap-2"
              >
                Source: {sourceFilter}
                <button
                  onClick={() => setSourceFilter("all")}
                  className="hover:text-purple-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        <div className="hidden lg:flex items-stretch gap-0 mb-8">
          {stats.map((stat, idx) => (
            <React.Fragment key={stat.label}>
              <div
                className={`flex-1 p-6 border rounded-2xl ${stat.color} transition-all hover:shadow-sm`}
              >
                <p className="text-xs font-bold text-gray-500 uppercase tracking-tight mb-2">
                  {stat.label}
                </p>
                <p className="text-4xl font-black text-gray-900 tracking-tight">
                  {stat.count}
                </p>
              </div>
              {idx < stats.length - 1 && (
                <div className="flex items-center justify-center px-4">
                  <svg width="32" height="32" viewBox="0 0 24 24">
                    <path
                      d="M4 11h12.17l-5.58-5.59L12 4l8 8-8 8-1.41-1.41L16.17 13H4v-2z"
                      fill="#d1d5db"
                    />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`p-6 border rounded-2xl ${stat.color} transition-all hover:shadow-sm`}
            >
              <p className="text-xs font-bold text-gray-500 uppercase tracking-tight mb-2">
                {stat.label}
              </p>
              <p className="text-4xl font-black text-gray-900 tracking-tight">
                {stat.count}
              </p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-24">Loading prospects...</div>
        ) : !prospects || prospects.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-2xl p-24 flex flex-col items-center justify-center text-center">
            <div className="p-6 bg-gray-50 rounded-full mb-4">
              <Users className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              No prospects yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-xs font-medium text-sm">
              Start building your pipeline by adding discovered talent
            </p>
            <Button
              onClick={onAddProspect}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 h-10 px-8 rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add First Prospect
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    PHOTO
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    NAME
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    CONTACT
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    NEW LEAD
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    IN CONTACT
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    TEST SHOOTS
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    OFFERS
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    SOURCE
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedProspect(p)}
                  >
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {p.full_name}
                      <div className="text-xs font-normal text-gray-500">
                        {p.categories?.join(", ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.email}
                      <div className="text-xs">{p.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "new_lead" ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-500" />
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "in_contact" ? (
                        <CheckCircle2 className="w-5 h-5 text-yellow-500" />
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {p.status.startsWith("test_shoot") && (
                        <Badge
                          className={`capitalize border ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-700 border-gray-200"}`}
                        >
                          {p.status.replace("test_shoot_", "")}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "signed" ? (
                        <Badge
                          className={`capitalize border ${STATUS_COLORS.signed}`}
                        >
                          {STATUS_MAP.signed}
                        </Badge>
                      ) : p.status === "declined" ? (
                        <Badge
                          className={`capitalize border ${STATUS_COLORS.declined}`}
                        >
                          {STATUS_MAP.declined}
                        </Badge>
                      ) : p.status === "opened" ? (
                        <Badge
                          className={`capitalize border ${STATUS_COLORS.opened}`}
                        >
                          Opened
                        </Badge>
                      ) : p.status === "offer_sent" ? (
                        <Badge className="capitalize border bg-gray-100 text-gray-700 border-gray-200">
                          Awaiting
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">
                      {p.source}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <ProspectDetailsSheet
        prospect={selectedProspect}
        onClose={() => setSelectedProspect(null)}
        onEdit={(p) => {
          setSelectedProspect(null);
          onEditProspect(p);
        }}
      />
    </div>
  );
};

const SocialDiscoveryTab = () => (
  <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-3xl">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Social Media Discovery Tool
        </h2>
        <p className="text-sm text-gray-500 font-medium">
          Find talent on Instagram, TikTok, and other platforms
        </p>
      </div>
      <Button
        variant="default"
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 h-10 px-6 rounded-lg shadow-sm"
      >
        <Instagram className="w-4 h-4" /> Connect Instagram
      </Button>
    </div>

    <div className="flex flex-col gap-6">
      <div className="flex gap-2 w-full">
        <div className="relative flex-1">
          <Input
            placeholder="Search by username, hashtag, or location..."
            className="h-10 border-gray-200 bg-white rounded-lg"
          />
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-8 rounded-lg shadow-sm">
          Search
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="flex items-center gap-2 border-gray-200 font-bold text-gray-700 px-6 h-9 rounded-lg"
        >
          <Instagram className="w-4 h-4" /> Instagram
        </Button>
        <Button
          variant="outline"
          className="border-gray-200 font-bold text-gray-700 px-6 h-9 rounded-lg"
        >
          TikTok
        </Button>
        <Button
          variant="outline"
          className="border-gray-200 font-bold text-gray-700 px-6 h-9 rounded-lg"
        >
          YouTube
        </Button>
      </div>

      <div className="border border-dashed border-gray-200 rounded-2xl p-24 flex flex-col items-center justify-center text-center mt-4">
        <div className="p-6 bg-gray-50 rounded-full mb-6">
          <Instagram className="w-12 h-12 text-gray-200" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Social Media Discovery Coming Soon
        </h3>
        <p className="text-gray-500 max-w-sm font-medium mb-8">
          Search Instagram, TikTok, and YouTube to find potential talent
        </p>

        <div className="bg-[#FAFAFA] border border-gray-100 p-8 rounded-2xl text-left max-w-md w-full">
          <h4 className="font-bold text-gray-900 mb-4">Features:</h4>
          <ul className="space-y-3">
            {[
              "Search by hashtags, locations, and usernames",
              "Filter by follower count and engagement rate",
              "Save profiles directly to prospect pipeline",
              "Track engagement metrics over time",
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 text-sm text-gray-600 font-medium"
              >
                <div className="w-1.5 h-1.5 bg-gray-900 rounded-full mt-1.5 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </Card>
);

const MarketplaceTab = () => (
  <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-3xl">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Likelee Marketplace</h2>
        <p className="text-sm text-gray-500 font-medium">
          Browse verified creators on the Likelee platform
        </p>
      </div>
      <Button
        variant="outline"
        className="flex items-center gap-2 border-gray-300 font-bold text-gray-700 px-6 h-10 rounded-lg shadow-sm"
      >
        <Filter className="w-4 h-4 text-gray-400" /> Filters
      </Button>
    </div>

    <div className="flex flex-col gap-6">
      <div className="flex gap-2 w-full">
        <div className="relative flex-1">
          <Input
            placeholder="Search by name, category, or skills..."
            className="h-10 border-gray-200 bg-white rounded-lg"
          />
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-8 rounded-lg shadow-sm">
          Search
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select defaultValue="all">
          <SelectTrigger className="h-11 border-gray-200">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="model">Models</SelectItem>
            <SelectItem value="actor">Actors</SelectItem>
            <SelectItem value="influencer">Influencers</SelectItem>
            <SelectItem value="athlete">Athletes</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="h-11 border-gray-200">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unsigned">Unsigned</SelectItem>
            <SelectItem value="signed">Signed</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="followers">
          <SelectTrigger className="h-11 border-gray-200">
            <SelectValue placeholder="Followers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="followers">Followers</SelectItem>
            <SelectItem value="engagement">Engagement</SelectItem>
            <SelectItem value="recent">Recently Added</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-dashed border-gray-200 rounded-2xl p-24 flex flex-col items-center justify-center text-center mt-4">
        <div className="p-6 bg-gray-50 rounded-full mb-6">
          <Globe className="w-12 h-12 text-gray-200" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Marketplace Integration Coming Soon
        </h3>
        <p className="text-gray-500 max-w-sm font-medium mb-8">
          Browse and connect with verified creators from the Likelee network
        </p>

        <div className="bg-[#FAFAFA] border border-gray-100 p-8 rounded-2xl text-left max-w-md w-full">
          <h4 className="font-bold text-gray-900 mb-4">Benefits:</h4>
          <ul className="space-y-3">
            {[
              "Access verified, vetted talent profiles",
              "See availability and booking rates",
              "Send connection requests directly",
              "Review portfolios and past campaigns",
            ].map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-3 text-sm text-gray-600 font-medium"
              >
                <div className="w-1.5 h-1.5 bg-gray-900 rounded-full mt-1.5 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </Card>
);

const ScoutingMapTab = ({
  onEditEvent,
  onViewProspect,
  onAddEvent,
  isVisible = true,
}: {
  onEditEvent: (event: ScoutingEvent) => void;
  onViewProspect: (prospect: ScoutingProspect) => void;
  onAddEvent: () => void;
  isVisible?: boolean;
}) => (
  <ScoutingMap
    onEditEvent={onEditEvent}
    onViewProspect={onViewProspect}
    onAddEvent={onAddEvent}
    isVisible={isVisible}
  />
);

const SubmissionsTab = () => (
  <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-3xl">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Website Submissions</h2>
        <p className="text-sm text-gray-500 font-medium">
          Review talent applications
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className="bg-indigo-50 text-indigo-700 font-bold px-4 py-2 text-sm rounded-xl h-11 flex items-center gap-2"
        >
          18 Pending Review
        </Badge>
        <Button
          variant="outline"
          className="font-bold text-gray-700 px-6 h-10 rounded-lg shadow-sm border-gray-300"
        >
          Bulk Actions
        </Button>
      </div>
    </div>

    <div className="border border-dashed border-gray-200 rounded-2xl p-32 flex flex-col items-center justify-center text-center">
      <div className="p-8 bg-gray-50 rounded-full mb-6">
        <Mail className="w-12 h-12 text-gray-200" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        No new submissions
      </h3>
      <p className="text-gray-500 max-w-sm font-medium">
        Applications from your website will appear here
      </p>
    </div>
  </Card>
);

const OpenCallsTab = ({
  onCreateEvent,
  onEditEvent,
}: {
  onCreateEvent: () => void;
  onEditEvent: (event: ScoutingEvent) => void;
}) => {
  const { user } = useAuth();
  const { data: events, isLoading } = useQuery({
    queryKey: ["scouting-events", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const agencyId = await scoutingService.getUserAgencyId();
      if (!agencyId) return [];
      return scoutingService.getEvents(agencyId);
    },
    enabled: !!user,
  });

  return (
    <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Open Calls & Casting Events
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Manage your upcoming talent search events
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-xs text-gray-500">
          Loading events...
        </div>
      ) : !events || events.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="p-6 bg-gray-50 rounded-full mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            No upcoming events
          </h3>
          <p className="text-xs text-gray-500 max-w-sm font-medium mb-4">
            Organize open calls and virtual castings to find new talent
          </p>
          <Button
            onClick={onCreateEvent}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 h-9 px-6 rounded-lg shadow-sm text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Create First Event
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <Card
              key={event.id}
              className="overflow-hidden border border-gray-100 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 group cursor-pointer rounded-xl bg-slate-50/30 hover:bg-white hover:-translate-y-1"
              onClick={() => onEditEvent(event)}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <Badge
                    className={`rounded-md font-bold px-2 py-0.5 text-[10px] border shadow-sm ${
                      String((event as any).status) === "published"
                        ? "bg-green-50 text-green-700 border-green-100"
                        : String((event as any).status) === "draft"
                          ? "bg-gray-50 text-gray-600 border-gray-100"
                          : String((event as any).status) === "scheduled"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : String((event as any).status) === "completed"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                              : String((event as any).status) === "cancelled"
                                ? "bg-red-50 text-red-700 border-red-100"
                                : "bg-gray-50 text-gray-600 border-gray-100"
                    }`}
                  >
                    {String((event as any).status || "").toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-1 text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-bold">
                      {event.start_time || "TBD"}
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1.5 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {event.name}
                </h3>
                <p className="text-xs text-gray-500 font-medium line-clamp-2 mb-4 min-h-[2rem]">
                  {event.description || "No description provided."}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50/80 p-2 rounded-lg border border-gray-100/50 group-hover:bg-indigo-50/30 transition-colors">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[11px] font-bold">
                      {new Date(event.event_date).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50/80 p-2 rounded-lg border border-gray-100/50 group-hover:bg-indigo-50/30 transition-colors">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[11px] font-bold truncate">
                      {event.location}
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50/30 border-t border-gray-100 flex justify-between items-center group-hover:bg-gray-50/80 transition-colors">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded border border-gray-100">
                  {event.event_type || "EVENT"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-indigo-600 font-bold hover:bg-indigo-600 hover:text-white transition-all text-[11px] px-3 rounded-md border border-transparent hover:border-indigo-600"
                >
                  Edit Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
};

const ScoutingAnalyticsTab = () => {
  const { user } = useAuth();
  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["scouting-analytics", user?.id],
    queryFn: async () => {
      const agencyId = await scoutingService.getUserAgencyId();
      if (!agencyId) return null;
      return scoutingService.getAnalytics(agencyId);
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
        <p>Failed to load analytics data.</p>
      </div>
    );
  }

  const stats = [
    {
      label: "TOTAL PROSPECTS",
      value: analytics.totalProspects.toString(),
      sub: "All time",
      subColor: "text-gray-500",
    },
    {
      label: "CONVERSION RATE",
      value: `${analytics.conversionRate}%`,
      sub: "Prospects → Signed",
      subColor: "text-gray-500",
    },
    {
      label: "AVG. TIME TO SIGN",
      value: `${analytics.avgTimeToSign}d`,
      sub: "From discovery",
      subColor: "text-gray-500",
    },
  ];

  const sourceLabels: Record<string, string> = {
    instagram: "Instagram",
    tiktok: "TikTok",
    street: "Street Scouting",
    referral: "Referral",
    website: "Website Submissions",
  };

  const sources = Object.entries(analytics.sources)
    .map(([key, count]) => ({
      name: sourceLabels[key] || key,
      value: Math.round((count / analytics.totalProspects) * 100),
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl"
          >
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              {stat.label}
            </p>
            <div className="mb-1">
              <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                {stat.value}
              </span>
            </div>
            <p className={`text-sm font-medium ${stat.subColor}`}>{stat.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
        <h3 className="text-sm font-bold text-gray-900 mb-6">
          Discovery Sources
        </h3>
        <div className="space-y-6">
          {sources.length > 0 ? (
            sources.map((source) => (
              <div key={source.name}>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {source.name}
                  </span>
                  <span className="text-xs font-bold text-gray-900">
                    {source.value}%
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-900 rounded-full"
                    style={{ width: `${source.value}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No source data available.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

const DashboardView = ({
  onKYC,
  kycStatus,
  kycLoading,
  onRefreshStatus,
  refreshLoading,
}: {
  onKYC: () => void;
  kycStatus?: string | null;
  kycLoading?: boolean;
  onRefreshStatus?: () => void;
  refreshLoading?: boolean;
}) => (
  <div className="space-y-8">
    {/* KYC Verification Alert */}
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white rounded-xl shadow-sm">
          <ShieldAlert className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {kycStatus === "approved"
              ? "KYC Completed"
              : "KYC Verification Required"}
          </h3>
          <p className="text-sm text-gray-500">
            {kycStatus === "approved"
              ? "Your agency identity verification is complete."
              : "To enable payouts and licensing for your talent, please complete\n            your agency's ID verification."}
          </p>
          <div className="mt-2 flex items-center gap-2">
            {kycStatus === "approved" ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : kycStatus === "pending" ? (
              <Clock className="w-4 h-4 text-yellow-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-gray-500" />
            )}
            <Badge
              variant="outline"
              className={
                kycStatus === "approved"
                  ? "bg-green-100 text-green-700"
                  : kycStatus === "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
              }
            >
              {kycStatus === "approved"
                ? "Approved"
                : kycStatus === "pending"
                  ? "Pending"
                  : "Not started"}
            </Badge>
            {kycStatus !== "approved" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRefreshStatus}
                disabled={!onRefreshStatus || !!kycLoading || !!refreshLoading}
                className="h-8 px-2"
                title="Refresh status"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshLoading ? "animate-spin" : ""}`}
                />
              </Button>
            )}
          </div>
        </div>
      </div>
      {kycStatus !== "approved" && (
        <Button
          variant="default"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 h-12 rounded-xl"
          onClick={onKYC}
          disabled={!!kycLoading || kycStatus === "pending"}
        >
          {kycStatus === "pending" ? "KYC Pending" : "Complete KYC"}
        </Button>
      )}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Roster Health */}
      <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl border-l-4 border-l-indigo-500">
        <div className="flex justify-between items-start mb-2">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <TrendingUp className="w-4 h-4 text-green-500" />
        </div>
        <h3 className="text-sm font-medium text-gray-500 mb-1">
          Roster Health
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">9/10</span>
        </div>
        <p className="text-xs text-green-600 font-medium mt-1">90% active</p>
      </Card>

      {/* Revenue */}
      <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl border-l-4 border-l-green-500">
        <div className="flex justify-between items-start mb-2">
          <div className="p-2 bg-green-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <TrendingUp className="w-4 h-4 text-green-500" />
        </div>
        <h3 className="text-sm font-medium text-gray-500 mb-1">
          Revenue This Month
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">$37.7K</span>
        </div>
        <p className="text-xs text-green-600 font-medium mt-1">
          +12% vs last month
        </p>
      </Card>

      {/* Pending Actions */}
      <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl border-l-4 border-l-red-500 relative">
        <div className="flex justify-between items-start mb-2">
          <div className="p-2 bg-red-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <Badge
            variant="default"
            className="bg-red-600 hover:bg-red-700 text-white border-0 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]"
          >
            3
          </Badge>
        </div>
        <h3 className="text-sm font-medium text-gray-500 mb-1">
          Pending Actions
        </h3>
        <div className="space-y-1">
          <p className="text-xs text-gray-600">• 3 licensing requests</p>
          <p className="text-xs text-gray-600">• 1 expiring license</p>
          <p className="text-xs text-gray-600">• 1 compliance issue</p>
        </div>
      </Card>

      {/* Platform Ranking */}
      <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl border-l-4 border-l-blue-400">
        <div className="flex justify-between items-start mb-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Trophy className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        <h3 className="text-sm font-medium text-gray-500 mb-1">
          Platform Ranking
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-blue-600">top 15%</span>
        </div>
        <p className="text-xs text-gray-500 font-medium mt-1">Top performer</p>
      </Card>
    </div>

    {/* Section 2: Talent Performance Summary (Screenshot 3 Layout) */}
    <Card className="p-8 rounded-xl border border-gray-200 shadow-sm bg-white">
      <h2 className="text-xl font-bold text-gray-900 mb-8">
        Talent Performance Summary
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Top 3 Revenue Generators */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="text-sm font-bold text-gray-900">
              Top 3 Revenue Generators
            </h3>
          </div>

          {[
            {
              rank: "#1",
              talent: TALENT_DATA.find((t) => t.id === "carla")!,
              amount: "$6,800",
              color: "text-green-600",
            },
            {
              rank: "#2",
              talent: TALENT_DATA.find((t) => t.id === "clemence")!,
              amount: "$5,400",
              color: "text-green-600",
            },
            {
              rank: "#3",
              talent: TALENT_DATA.find((t) => t.id === "julia")!,
              amount: "$5,200",
              color: "text-green-600",
            },
          ].map((item) => (
            <div
              key={item.rank}
              className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <span className={`font-bold text-2xl w-10 ${item.color}`}>
                {item.rank}
              </span>
              <img
                src={item.talent.img}
                alt={item.talent.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm">
                  {item.talent.name}
                </p>
                <p className="text-xs text-gray-500">{item.amount}</p>
              </div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
          ))}
        </div>

        {/* Needs Activation */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-900">
              Needs Activation (0)
            </h3>
          </div>
          <p className="text-sm text-gray-500 italic">
            All talent actively earning!
          </p>
        </div>

        {/* New Talent Performance */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-900">
              New Talent Performance
            </h3>
          </div>

          <div className="p-6 border border-gray-100 rounded-xl bg-white shadow-sm space-y-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Onboarded in last 30 days
            </p>
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900 text-sm">Aaron</span>
              <Badge
                variant="default"
                className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-0 uppercase font-bold text-[10px]"
              >
                Pending
              </Badge>
            </div>
            <p className="text-xs text-gray-500">
              Average time to First booking: 12 days
            </p>
          </div>
        </div>
      </div>
    </Card>

    {/* Section 3: Revenue Breakdown (Detailed) */}
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">Revenue Breakdown</h2>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* By Campaign Type */}
        <div className="p-6 border border-gray-100 rounded-xl">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">
            By Campaign Type
          </h3>
          <div className="space-y-4">
            {[
              { label: "Social Media", value: "45%" },
              { label: "E-commerce", value: "35%" },
              { label: "Traditional", value: "20%" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between items-center"
              >
                <span className="text-sm font-medium text-gray-600">
                  {item.label}
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* By Brand Vertical */}
        <div className="p-6 border border-gray-100 rounded-xl">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">
            By Brand Vertical
          </h3>
          <div className="space-y-4">
            {[
              { label: "Beauty", value: "40%" },
              { label: "Fashion", value: "35%" },
              { label: "Lifestyle", value: "25%" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between items-center"
              >
                <span className="text-sm font-medium text-gray-600">
                  {item.label}
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* By Region */}
        <div className="p-6 border border-gray-100 rounded-xl">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">
            By Region
          </h3>
          <div className="space-y-4">
            {[
              { label: "North America", value: "60%" },
              { label: "Europe", value: "30%" },
              { label: "Other", value: "10%" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between items-center"
              >
                <span className="text-sm font-medium text-gray-600">
                  {item.label}
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Section 4: Licensing Pipeline (Detailed) */}
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">Licensing Pipeline</h2>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-white border border-yellow-200 shadow-sm rounded-xl">
          <div className="mb-4">
            <div className="w-8 h-8 rounded-full border border-yellow-400 flex items-center justify-center text-yellow-500 mb-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500">
              Pending Approval
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-4">3</div>
          <Button
            variant="default"
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold h-10"
          >
            Review Now
          </Button>
        </Card>
        <Card className="p-6 bg-white border border-green-200 shadow-sm rounded-xl">
          <div className="mb-4">
            <div className="w-8 h-8 rounded-full border border-green-400 flex items-center justify-center text-green-500 mb-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500">Active</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-4">9</div>
        </Card>
        <Card className="p-6 bg-white border border-orange-200 shadow-sm rounded-xl">
          <div className="mb-4">
            <div className="w-8 h-8 rounded-full border border-orange-400 flex items-center justify-center text-orange-500 mb-2 text-lg">
              !
            </div>
            <span className="text-xs font-medium text-gray-500">
              Expiring Soon (30d)
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-4">1</div>
          <Button
            variant="outline"
            className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 font-bold h-10"
          >
            Review
          </Button>
        </Card>
        <Card className="p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div className="mb-4">
            <div className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center text-gray-400 mb-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500">
              Total This Month
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-4">13</div>
        </Card>
      </div>
    </div>

    {/* Section 5: Recent Activity (Detailed) */}
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
      </div>
      <div className="p-8 space-y-10">
        {[
          {
            text: "License approved for Emma - Glossier Beauty",
            time: "2 hours ago",
            color: "bg-blue-600",
          },
          {
            text: "Payment received: $5,200 from & Other Stories",
            time: "5 hours ago",
            color: "bg-green-600",
          },
          {
            text: "Aaron added to roster (pending verification)",
            time: "1 day ago",
            color: "bg-purple-600",
          },
          {
            text: "License renewed for Milan - Carhartt WIP",
            time: "2 days ago",
            color: "bg-blue-600",
          },
        ].map((item, i) => (
          <div key={i} className="flex gap-4">
            <div
              className={`mt-1.5 w-2.5 h-2.5 rounded-full ${item.color} flex-shrink-0`}
            />
            <div>
              <p className="text-sm font-bold text-gray-900">{item.text}</p>
              <p className="text-xs text-gray-500 mt-1">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const RosterView = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  consentFilter,
  setConsentFilter,
  sortConfig,
  setSortConfig,
  profile,
  agencyKycStatus,
}: {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  consentFilter: string;
  setConsentFilter: (s: string) => void;
  sortConfig: { key: string; direction: "asc" | "desc" } | null;
  setSortConfig: (c: { key: string; direction: "asc" | "desc" } | null) => void;
  profile: any;
  agencyKycStatus: string | null;
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rosterTab, setRosterTab] = useState("roster");

  const portalLink = useMemo(() => {
    try {
      return `${window.location.origin}/talentportal`;
    } catch {
      return "/talentportal";
    }
  }, []);

  const copyPortalLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(portalLink);
      } else {
        const el = document.createElement("textarea");
        el.value = portalLink;
        el.setAttribute("readonly", "");
        el.style.position = "absolute";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      toast({
        title: "Portal link copied",
        description:
          "Share it with your talent to join and access their portal.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to copy portal link",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    }
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const filteredTalent = React.useMemo(() => {
    let data = [...TALENT_DATA];

    // Search
    if (searchTerm) {
      data = data.filter((t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Status
    if (statusFilter !== "All Status") {
      data = data.filter(
        (t) => t.status.toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    // Consent
    if (consentFilter !== "All Consent") {
      data = data.filter(
        (t) => t.consent.toLowerCase() === consentFilter.toLowerCase(),
      );
    }

    // Sort
    if (sortConfig) {
      data.sort((a, b) => {
        const valA =
          (a as any)[sortConfig.key + "Val"] ?? (a as any)[sortConfig.key];
        const valB =
          (b as any)[sortConfig.key + "Val"] ?? (b as any)[sortConfig.key];

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [searchTerm, statusFilter, consentFilter, sortConfig]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All Status");
    setConsentFilter("All Consent");
    setSortConfig(null);
  };

  return (
    <div className="space-y-6">
      {/* Agency Header Section using Cards for structure */}
      <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg flex items-center justify-center p-2 shadow-sm overflow-hidden">
              {profile?.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={profile.agency_name || "Agency"}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="font-serif text-2xl font-bold text-gray-900">
                  {profile?.agency_name?.substring(0, 2)?.toUpperCase() || "AG"}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile?.agency_name || "Agency Name"}
                </h1>
                {/* Verified Badge */}
                {agencyKycStatus === "approved" && (
                  <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Verified Agency
                  </div>
                )}
                <div className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                  Marketplace: Public
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 font-medium">
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  U.S.
                </span>
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  {profile?.website || "https://agency.com/"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="text-gray-700 border-gray-300 gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Edit Profile
            </Button>
            <Button
              variant="outline"
              className="text-gray-700 border-gray-300 gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              View Marketplace
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 my-6"></div>

        {/* Footer Stats */}
        <div className="flex flex-wrap gap-8 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full border border-green-500 flex items-center justify-center">
              <svg
                className="w-3 h-3 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="font-medium">Stripe Connected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full border border-green-500 flex items-center justify-center">
              <svg
                className="w-3 h-3 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="font-medium">ElevenLabs Connected</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="font-medium">
              {TALENT_DATA.length} / 15 seats used
            </span>
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-1">
              Active Talent
            </h3>
            <div className="text-3xl font-bold text-gray-900">
              {TALENT_DATA.filter((t) => t.status === "active").length}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              of {TALENT_DATA.length} total
            </p>
          </div>
          <Users className="w-10 h-10 text-gray-300" />
        </Card>
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-1">
              Monthly Earnings
            </h3>
            <div className="text-3xl font-bold text-gray-900">$37.7K</div>
            <p className="text-xs text-green-600 font-medium mt-1">
              +12% vs last month
            </p>
          </div>
          <span className="text-4xl text-gray-300 font-serif">$</span>
        </Card>
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-1">
              Active Campaigns
            </h3>
            <div className="text-3xl font-bold text-gray-900">9</div>
            <p className="text-xs text-gray-500 mt-1">across all talent</p>
          </div>
          <FileText className="w-10 h-10 text-gray-300" />
        </Card>
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-1">
              Expiring Licenses
            </h3>
            <div className="text-3xl font-bold text-gray-900">0</div>
            <p className="text-xs text-gray-400 mt-1">require renewal</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-300 font-bold text-xl">
            !
          </div>
        </Card>
      </div>

      {/* Roster Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tabs and Actions */}
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRosterTab("roster")}
              className={`px-4 py-2 text-sm font-bold transition-colors ${rosterTab === "roster" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500 hover:text-gray-900"}`}
            >
              Roster
            </button>
            <button
              onClick={() => setRosterTab("campaigns")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${rosterTab === "campaigns" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500 hover:text-gray-900"}`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setRosterTab("licenses")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${rosterTab === "licenses" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500 hover:text-gray-900"}`}
            >
              Licenses
            </button>
            <button
              onClick={() => setRosterTab("analytics")}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${rosterTab === "analytics" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500 hover:text-gray-900"}`}
            >
              Analytics{" "}
              <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                Pro
              </span>
            </button>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={copyPortalLink}
              className="flex items-center gap-2 text-gray-700"
            >
              <Copy className="w-4 h-4" /> Send portal link
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 text-gray-700"
            >
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button
              variant="default"
              onClick={() => navigate("/addtalent")}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4" /> Add Talent
            </Button>
          </div>
        </div>

        {rosterTab === "roster" && (
          <>
            {/* Filter Bar */}
            <div className="p-4 bg-white flex flex-col md:flex-row gap-4 border-b border-gray-200">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search talent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10 w-40 pr-10 hover:border-gray-400"
                  >
                    <option>All Status</option>
                    <option>Active</option>
                    <option>Pending</option>
                    <option>Inactive</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={consentFilter}
                    onChange={(e) => setConsentFilter(e.target.value)}
                    className="appearance-none px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10 w-48 pr-10 hover:border-gray-400"
                  >
                    <option>All Consent</option>
                    <option>Complete</option>
                    <option>Missing</option>
                    <option>Expiring</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {(searchTerm ||
                  statusFilter !== "All Status" ||
                  consentFilter !== "All Consent" ||
                  sortConfig) && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    <X className="w-4 h-4" /> Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-white border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1 hover:text-gray-600 transition-colors uppercase"
                      >
                        Talent <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("status")}
                        className="flex items-center gap-1 hover:text-gray-600 transition-colors uppercase"
                      >
                        Status <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("consent")}
                        className="flex items-center gap-1 hover:text-gray-600 transition-colors uppercase"
                      >
                        Consent <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      AI Usage
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("followers")}
                        className="flex items-center gap-1 hover:text-gray-600 transition-colors uppercase"
                      >
                        Followers <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Assets
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Top Brand
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      License Expiry
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("earnings")}
                        className="flex items-center gap-1 hover:text-gray-600 transition-colors uppercase"
                      >
                        30D Earnings <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("projected")}
                        className="flex items-center gap-1 hover:text-gray-600 transition-colors uppercase"
                      >
                        Projected <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTalent.map((talent) => (
                    <tr
                      key={talent.id}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={talent.img}
                            alt={talent.name}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                          />
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-gray-900 text-sm tracking-tight">
                                {talent.name}
                              </span>
                              {talent.isVerified && (
                                <svg
                                  className="w-3.5 h-3.5 text-blue-500"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                              {talent.role}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${talent.status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
                        >
                          {talent.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 w-fit uppercase tracking-wider ${
                            talent.consent === "complete"
                              ? "bg-green-50 text-green-600"
                              : talent.consent === "missing"
                                ? "bg-red-50 text-red-600"
                                : "bg-orange-50 text-orange-600"
                          }`}
                        >
                          {talent.consent === "complete" ||
                          talent.consent === "active" ? (
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.3}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.3}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                          {talent.consent}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          {talent.aiUsage.length > 0 ? (
                            talent.aiUsage.map((usage) => (
                              <div
                                key={usage}
                                className="px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-[9px] font-bold text-gray-500 flex items-center gap-1 uppercase tracking-tight"
                              >
                                {usage === "Video" && (
                                  <svg
                                    className="w-2.5 h-2.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                  </svg>
                                )}
                                {usage === "Image" && (
                                  <svg
                                    className="w-2.5 h-2.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                )}
                                {usage === "Voice" && (
                                  <svg
                                    className="w-2.5 h-2.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                    />
                                  </svg>
                                )}
                                {usage}
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-300 text-[10px]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600 flex items-center gap-1.5 pt-7">
                        <Instagram className="w-3.5 h-3.5 text-pink-600" />
                        {talent.followers}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-500">
                        {talent.assets}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-900">
                        {talent.brand}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-red-500 font-bold">
                        {talent.expiry !== "—" && talent.expiry}
                        {talent.expiry === "—" && (
                          <span className="text-gray-300 font-medium">—</span>
                        )}
                        {talent.expiry.includes("2025") && (
                          <span className="ml-1 inline-block w-3.5 h-3.5 text-red-500 opacity-80">
                            <AlertCircle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-900">
                        {talent.earnings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-400 group-hover:text-gray-600 transition-colors">
                        {talent.projected}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="p-1.5 rounded-full hover:bg-gray-100 transition-colors inline-block cursor-pointer">
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {rosterTab === "campaigns" && (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">
              Campaign tracking coming soon
            </p>
          </div>
        )}

        {rosterTab === "licenses" && (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50">
            <Shield className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">
              License management coming soon
            </p>
          </div>
        )}

        {rosterTab === "analytics" && (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50 text-center px-4">
            <svg
              className="w-16 h-16 text-gray-300 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Advanced Analytics
            </h3>
            <p className="text-gray-500 max-w-sm mb-6 text-sm">
              Upgrade to Agency Pro to unlock revenue forecasting, performance
              charts, and insights.
            </p>
            <Button
              variant="default"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8"
            >
              Upgrade to Pro
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Assuming LicensingRequestsView is now imported from another file.
// If it was defined here, its definition has been removed as per the instruction.
// Add the import statement for LicensingRequestsView here if it's used in this file.
// For example: import { LicensingRequestsView } from './LicensingRequestsView';

const ActiveLicensesView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedLicense, setSelectedLicense] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleViewDetails = (license: any) => {
    setSelectedLicense(license);
    setIsDetailsOpen(true);
  };

  const handleRenew = (license: any) => {
    // renewal logic
  };

  const { data: licenses = [], isLoading: isLicensesLoading } = useQuery<any[]>(
    {
      queryKey: ["agency", "active-licenses", filterStatus, searchTerm],
      queryFn: async () => {
        const params: any = {};
        if (filterStatus !== "All") params.status = filterStatus;
        if (searchTerm) params.search = searchTerm;
        return await getAgencyActiveLicenses(params);
      },
    },
  );

  const { data: stats } = useQuery({
    queryKey: ["agency", "active-licenses", "stats"],
    queryFn: () => getAgencyActiveLicensesStats(),
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500";
      case "Expiring":
        return "bg-orange-500";
      case "Expired":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const filteredLicenses = licenses; // Filtering handled by API now

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">
            Active Licenses
          </h2>
          <p className="text-gray-500 font-medium">
            Manage all talent licensing agreements
          </p>
        </div>
        <Button
          variant="default"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 px-6 h-11 rounded-xl shadow-lg shadow-indigo-200"
        >
          <Download className="w-4 h-4" /> Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            icon: CheckCircle2,
            label: "Active Licenses",
            value: stats?.active || "0",
            color: "text-green-600",
            bg: "bg-green-50",
            border: "border-green-100",
          },
          {
            icon: Clock,
            label: "Expiring Soon",
            value: stats?.expiring || "0",
            color: "text-orange-600",
            bg: "bg-orange-50",
            border: "border-orange-100",
          },
          {
            icon: AlertCircle,
            label: "Expired",
            value: stats?.expired || "0",
            color: "text-red-600",
            bg: "bg-red-50",
            border: "border-red-100",
          },
          {
            icon: DollarSign,
            label: "Total Value",
            value: formatMoney(stats?.total_value || 0),
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "border-indigo-100",
            large: true,
          },
        ].map((card, i) => (
          <Card
            key={i}
            className={`p-6 bg-white border ${card.border} shadow-sm rounded-2xl`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}
              >
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className={`text-sm font-bold ${card.color}`}>{card.label}</p>
            </div>
            <p className="text-3xl font-black text-gray-900">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by talent, brand, or license type..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            />
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg ml-auto">
            {["All", "Active", "Expiring", "Expired"].map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterStatus(filter)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filterStatus === filter ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Talent
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  License Type
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Brand
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Deadline
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Usage Scope
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Value
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {licenses.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <FileText className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-900 font-medium">
                        No active licenses found
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Try adjusting your filters or search terms
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {licenses.map((lic: any) => (
                <tr
                  key={lic.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-8 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        {lic.talent_avatar ? (
                          <img
                            src={lic.talent_avatar}
                            alt={lic.talent_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Users className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm leading-none mb-1">
                          {lic.talent_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-8">
                    <p className="text-sm font-bold text-gray-900 leading-tight max-w-[150px]">
                      {lic.license_type || "Unknown License"}
                    </p>
                  </td>
                  <td className="px-6 py-8">
                    <p className="text-sm font-bold text-gray-900">
                      {lic.brand || "Unknown Brand"}
                    </p>
                  </td>
                  <td className="px-6 py-8">
                    {lic.start_date || lic.end_date || lic.deadline ? (
                      <>
                        {lic.start_date && (
                          <p className="text-xs font-bold text-gray-900 mb-1">
                            {new Date(lic.start_date).toLocaleDateString()}
                          </p>
                        )}
                        {lic.end_date ? (
                          <p className="text-[10px] font-medium text-gray-400 mb-1">
                            to {new Date(lic.end_date).toLocaleDateString()}
                          </p>
                        ) : lic.deadline ? (
                          <p className="text-[10px] font-medium text-gray-400 mb-1">
                            Deadline:{" "}
                            {new Date(lic.deadline).toLocaleDateString()}
                          </p>
                        ) : lic.start_date && lic.duration_days ? (
                          <p className="text-[10px] font-medium text-gray-400 mb-1">
                            Deadline:{" "}
                            {(() => {
                              const d = new Date(lic.start_date);
                              d.setDate(d.getDate() + lic.duration_days);
                              return d.toLocaleDateString();
                            })()}
                          </p>
                        ) : null}
                        {lic.days_left !== null &&
                          lic.days_left !== undefined && (
                            <p className="text-[10px] font-bold text-gray-400 italic">
                              {lic.days_left > 0
                                ? `${lic.days_left} days left`
                                : lic.days_left === 0
                                  ? "Expires today"
                                  : "Expired"}
                            </p>
                          )}
                      </>
                    ) : (
                      <p className="text-xs font-medium text-gray-400">
                        Ongoing
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-8">
                    <p className="text-xs font-medium text-gray-600 max-w-[140px] leading-relaxed">
                      {Array.isArray(lic.usage_scope)
                        ? lic.usage_scope.join(", ")
                        : String(lic.usage_scope || "")}
                    </p>
                  </td>
                  <td className="px-6 py-8">
                    <p className="text-sm font-bold text-gray-900 mb-2">
                      {formatMoney(lic.value)}
                    </p>
                    {lic.auto_renew && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold w-fit border border-blue-100">
                        <RefreshCw className="w-3.5 h-3.5" /> Auto-renew
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-8 whitespace-nowrap">
                    <span
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black text-white uppercase tracking-wider shadow-sm ${statusColor(lic.status)}`}
                    >
                      {lic.status}
                    </span>
                  </td>
                  <td className="px-6 py-8 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2">
                      {String(lic.status).includes("Expiring") && (
                        <Button className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white text-[11px] font-extrabold rounded-lg flex items-center gap-2 shadow-md shadow-green-100 transition-all active:scale-95">
                          <RefreshCw className="w-3.5 h-3.5" /> Renew
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="h-9 w-9 p-0 border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-300 rounded-lg bg-white shadow-sm transition-all active:scale-95"
                        onClick={() => handleViewDetails(lic)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ActiveLicenseDetailsSheet
        license={selectedLicense}
        open={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onRenew={handleRenew}
      />
    </div>
  );
};

const LicenseTemplatesView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    templateId: number | null;
  }>({ show: false, templateId: null });
  const [templates, setTemplates] = useState([
    {
      id: 1,
      name: "Standard Social Media",
      category: "Social Media",
      categoryColor: "bg-purple-100 text-purple-700",
      description:
        "Standard license for Instagram, TikTok, and Facebook content",
      usageScope: "Organic Social Media (Instagram, TikTok, Facebook)",
      duration: "90 days",
      territory: "North America",
      exclusivity: "Non-exclusive",
      pricing: "$500 - $1,200",
    },
    {
      id: 2,
      name: "E-commerce Product",
      category: "E-commerce",
      categoryColor: "bg-green-100 text-green-700",
      description:
        "License for product pages, email marketing, and digital ads",
      usageScope: "E-commerce website, email campaigns, digital ads",
      duration: "180 days",
      territory: "Worldwide",
      exclusivity: "Category exclusive (no competing brands)",
      pricing: "$2,000 - $5,000",
    },
    {
      id: 3,
      name: "Traditional Advertising",
      category: "Advertising",
      categoryColor: "bg-blue-100 text-blue-700",
      description: "TV, print, and out-of-home advertising campaigns",
      usageScope: "TV commercials, print magazines, billboards, transit ads",
      duration: "12 months",
      territory: "North America + Europe",
      exclusivity: "Full exclusivity in category",
      pricing: "$10,000 - $25,000",
    },
    {
      id: 4,
      name: "Influencer Partnership",
      category: "Social Media",
      categoryColor: "bg-purple-100 text-purple-700",
      description: "Long-term brand ambassador and content collaboration",
      usageScope: "All social platforms, blog, email, website",
      duration: "6 months",
      territory: "Worldwide",
      exclusivity: "Category exclusive",
      pricing: "$5,000 - $15,000/month",
    },
    {
      id: 5,
      name: "Print Editorial",
      category: "Editorial",
      categoryColor: "bg-teal-100 text-teal-700",
      description: "Magazine editorial and print publication licensing",
      usageScope: "Print magazine, digital edition, magazine website",
      duration: "12 months",
      territory: "Publication distribution area",
      exclusivity: "Non-exclusive",
      pricing: "$800 - $2,500",
    },
  ]);

  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "",
    description: "",
    usageScope: "",
    duration: "",
    territory: "",
    exclusivity: "",
    modificationsAllowed: "",
    pricingRange: "",
    additionalTerms: "",
  });

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "All Categories" ||
      template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.category) {
      alert("Please fill in at least the template name and category");
      return;
    }

    const categoryColors: Record<string, string> = {
      "Social Media": "bg-purple-100 text-purple-700",
      "E-commerce": "bg-green-100 text-green-700",
      Advertising: "bg-blue-100 text-blue-700",
      Editorial: "bg-teal-100 text-teal-700",
      "Film & TV": "bg-pink-100 text-pink-700",
      Custom: "bg-gray-100 text-gray-700",
    };

    const newTemplateObj = {
      id: templates.length + 1,
      name: newTemplate.name,
      category: newTemplate.category,
      categoryColor:
        categoryColors[newTemplate.category] || "bg-gray-100 text-gray-700",
      description: newTemplate.description,
      usageScope: newTemplate.usageScope,
      duration: newTemplate.duration,
      territory: newTemplate.territory,
      exclusivity: newTemplate.exclusivity,
      pricing: newTemplate.pricingRange,
    };

    setTemplates([...templates, newTemplateObj]);
    setIsModalOpen(false);
    setNewTemplate({
      name: "",
      category: "",
      description: "",
      usageScope: "",
      duration: "",
      territory: "",
      exclusivity: "",
      modificationsAllowed: "",
      pricingRange: "",
      additionalTerms: "",
    });
  };

  // Copy template handler
  const handleCopyTemplate = (template: any) => {
    const newTemplateObj = {
      ...template,
      id: templates.length + 1,
      name: `${template.name} (Copy)`,
    };
    setTemplates([...templates, newTemplateObj]);
  };

  // Edit template handler
  const handleEditTemplate = (template: any) => {
    setEditingTemplate({
      ...template,
      pricingRange: template.pricing,
      modificationsAllowed:
        template.modificationsAllowed ||
        "Minor edits allowed (color grading, cropping)",
      additionalTerms:
        template.additionalTerms ||
        "Must credit talent in caption. No political or controversial content.",
    });
    setIsEditModalOpen(true);
  };

  // Update template handler
  const handleUpdateTemplate = () => {
    if (!editingTemplate.name || !editingTemplate.category) {
      alert("Please fill in at least the template name and category");
      return;
    }

    const updatedTemplates = templates.map((t) =>
      t.id === editingTemplate.id
        ? {
            ...editingTemplate,
            pricing: editingTemplate.pricingRange,
          }
        : t,
    );
    setTemplates(updatedTemplates);
    setIsEditModalOpen(false);
    setEditingTemplate(null);
  };

  // Delete template handler
  const handleDeleteClick = (templateId: number) => {
    setDeleteConfirmation({ show: true, templateId });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (
        deleteConfirmation.show &&
        deleteConfirmation.templateId === templateId
      ) {
        setDeleteConfirmation({ show: false, templateId: null });
      }
    }, 3000);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmation.templateId) {
      setTemplates(
        templates.filter((t) => t.id !== deleteConfirmation.templateId),
      );
      setDeleteConfirmation({ show: false, templateId: null });
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmation({ show: false, templateId: null });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            License Templates
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Pre-built license terms you can reuse for faster negotiations
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Template
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6 bg-white border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Total Templates</p>
          <p className="text-3xl font-bold text-gray-900">{templates.length}</p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Categories</p>
          <p className="text-3xl font-bold text-gray-900">6</p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Most Used</p>
          <p className="text-xl font-bold text-gray-900">Social Media</p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Avg Deal Value</p>
          <p className="text-3xl font-bold text-gray-900">$3.2K</p>
        </Card>
      </div>

      {/* Search and Filter Container */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-w-[200px]"
          >
            <option>All Categories</option>
            <option>Social Media</option>
            <option>E-commerce</option>
            <option>Advertising</option>
            <option>Editorial</option>
            <option>Film & TV</option>
            <option>Custom</option>
          </select>
        </div>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-2 gap-6">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className="p-6 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {template.name}
                  </h3>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1 ${template.categoryColor}`}
                  >
                    {template.category}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0 border-gray-200 text-gray-400 hover:text-gray-900"
                  onClick={() => handleCopyTemplate(template)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0 border-gray-200 text-gray-400 hover:text-gray-900"
                  onClick={() => handleEditTemplate(template)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0 border-gray-200 text-gray-400 hover:text-red-600"
                  onClick={() => handleDeleteClick(template.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{template.description}</p>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Usage Scope:</span>
                <span className="text-gray-900 font-medium text-right flex-1 ml-4">
                  {template.usageScope}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duration:</span>
                <span className="text-gray-900 font-medium">
                  {template.duration}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Territory:</span>
                <span className="text-gray-900 font-medium">
                  {template.territory}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Exclusivity:</span>
                <span className="text-gray-900 font-medium">
                  {template.exclusivity}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pricing:</span>
                <span className="text-green-600 font-bold">
                  {template.pricing}
                </span>
              </div>
            </div>

            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              Use This Template
            </Button>
          </Card>
        ))}
      </div>

      {/* New Template Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-white">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <DialogTitle className="text-2xl font-bold text-gray-900">
                New License Template
              </DialogTitle>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-1">
                  <Label className="block text-sm font-bold text-gray-900 mb-2">
                    Template Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Standard Social Media"
                    value={newTemplate.name}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, name: e.target.value })
                    }
                    className="h-11 border-gray-200 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="col-span-1">
                  <Label className="block text-sm font-bold text-gray-900 mb-2">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={newTemplate.category}
                    onValueChange={(value) =>
                      setNewTemplate({ ...newTemplate, category: value })
                    }
                  >
                    <SelectTrigger className="h-11 border-gray-200">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Social Media">Social Media</SelectItem>
                      <SelectItem value="E-commerce">E-commerce</SelectItem>
                      <SelectItem value="Advertising">Advertising</SelectItem>
                      <SelectItem value="Editorial">Editorial</SelectItem>
                      <SelectItem value="Film & TV">Film & TV</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="block text-sm font-bold text-gray-900 mb-2">
                  Description
                </Label>
                <Textarea
                  placeholder="Standard license for Instagram, TikTok, and Facebook content"
                  value={newTemplate.description}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      description: e.target.value,
                    })
                  }
                  className="min-h-[100px] border-gray-200 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div>
                <Label className="block text-sm font-bold text-gray-900 mb-2">
                  Usage Scope
                </Label>
                <Input
                  placeholder="Organic Social Media (Instagram, TikTok, Facebook)"
                  value={newTemplate.usageScope}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      usageScope: e.target.value,
                    })
                  }
                  className="h-11 border-gray-200 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <Label className="block text-sm font-bold text-gray-900 mb-2">
                    Duration
                  </Label>
                  <Input
                    placeholder="90 days"
                    value={newTemplate.duration}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        duration: e.target.value,
                      })
                    }
                    className="h-11 border-gray-200 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-bold text-gray-900 mb-2">
                    Territory
                  </Label>
                  <Input
                    placeholder="North America"
                    value={newTemplate.territory}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        territory: e.target.value,
                      })
                    }
                    className="h-11 border-gray-200 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-bold text-gray-900 mb-2">
                    Exclusivity
                  </Label>
                  <Select
                    value={newTemplate.exclusivity}
                    onValueChange={(value) =>
                      setNewTemplate({ ...newTemplate, exclusivity: value })
                    }
                  >
                    <SelectTrigger className="h-11 border-gray-200">
                      <SelectValue placeholder="Non-exclusive" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Non-exclusive">
                        Non-exclusive
                      </SelectItem>
                      <SelectItem value="Category exclusive">
                        Category exclusive
                      </SelectItem>
                      <SelectItem value="Full exclusivity">
                        Full exclusivity
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="block text-sm font-bold text-gray-900 mb-2">
                  Modifications Allowed
                </Label>
                <Textarea
                  placeholder="Minor edits allowed (color grading, cropping)"
                  value={newTemplate.modificationsAllowed}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      modificationsAllowed: e.target.value,
                    })
                  }
                  className="min-h-[80px] border-gray-200 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div>
                <Label className="block text-sm font-bold text-gray-900 mb-2">
                  Pricing Range
                </Label>
                <Input
                  placeholder="$500 - $1,500"
                  value={newTemplate.pricingRange}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      pricingRange: e.target.value,
                    })
                  }
                  className="h-11 border-gray-200 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <Label className="block text-sm font-bold text-gray-900 mb-2">
                  Additional Terms
                </Label>
                <Textarea
                  placeholder="Must credit talent in caption. No political or controversial content."
                  value={newTemplate.additionalTerms}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      additionalTerms: e.target.value,
                    })
                  }
                  className="min-h-[100px] border-gray-200 focus:ring-indigo-500/20 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50/50">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 h-12 font-bold bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTemplate}
                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Create Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-white">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Edit Template
              </DialogTitle>
            </div>

            {editingTemplate && (
              <>
                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-1">
                      <Label className="block text-sm font-bold text-gray-900 mb-2">
                        Template Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={editingTemplate.name}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            name: e.target.value,
                          })
                        }
                        placeholder="Standard Social Media"
                        className="h-11 border-gray-200 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="block text-sm font-bold text-gray-900 mb-2">
                        Category <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={editingTemplate.category}
                        onValueChange={(value) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            category: value,
                          })
                        }
                      >
                        <SelectTrigger className="h-11 border-gray-200">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Social Media">
                            Social Media
                          </SelectItem>
                          <SelectItem value="E-commerce">E-commerce</SelectItem>
                          <SelectItem value="Advertising">
                            Advertising
                          </SelectItem>
                          <SelectItem value="Editorial">Editorial</SelectItem>
                          <SelectItem value="Film & TV">Film & TV</SelectItem>
                          <SelectItem value="Custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="block text-sm font-bold text-gray-900 mb-2">
                      Description
                    </Label>
                    <Textarea
                      value={editingTemplate.description}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          description: e.target.value,
                        })
                      }
                      className="min-h-[100px] border-gray-200 focus:ring-indigo-500/20 resize-none"
                      placeholder="Brief description of the license template"
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-bold text-gray-900 mb-2">
                      Usage Scope
                    </Label>
                    <Input
                      value={editingTemplate.usageScope}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          usageScope: e.target.value,
                        })
                      }
                      placeholder="Organic Social Media (Instagram, TikTok, Facebook)"
                      className="h-11 border-gray-200 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <Label className="block text-sm font-bold text-gray-900 mb-2">
                        Duration
                      </Label>
                      <Input
                        value={editingTemplate.duration}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            duration: e.target.value,
                          })
                        }
                        placeholder="90 days"
                        className="h-11 border-gray-200 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-bold text-gray-900 mb-2">
                        Territory
                      </Label>
                      <Input
                        value={editingTemplate.territory}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            territory: e.target.value,
                          })
                        }
                        placeholder="North America"
                        className="h-11 border-gray-200 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-bold text-gray-900 mb-2">
                        Exclusivity
                      </Label>
                      <Select
                        value={editingTemplate.exclusivity}
                        onValueChange={(value) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            exclusivity: value,
                          })
                        }
                      >
                        <SelectTrigger className="h-11 border-gray-200">
                          <SelectValue placeholder="Non-exclusive" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Non-exclusive">
                            Non-exclusive
                          </SelectItem>
                          <SelectItem value="Category exclusive">
                            Category exclusive
                          </SelectItem>
                          <SelectItem value="Full exclusivity">
                            Full exclusivity
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="block text-sm font-bold text-gray-900 mb-2">
                      Modifications Allowed
                    </Label>
                    <Textarea
                      value={editingTemplate.modificationsAllowed}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          modificationsAllowed: e.target.value,
                        })
                      }
                      className="min-h-[80px] border-gray-200 focus:ring-indigo-500/20 resize-none"
                      placeholder="Minor edits allowed (color grading, cropping)"
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-bold text-gray-900 mb-2">
                      Pricing Range
                    </Label>
                    <Input
                      value={editingTemplate.pricingRange}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          pricingRange: e.target.value,
                        })
                      }
                      placeholder="$500 - $1,500"
                      className="h-11 border-gray-200 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-bold text-gray-900 mb-2">
                      Additional Terms
                    </Label>
                    <Textarea
                      value={editingTemplate.additionalTerms}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          additionalTerms: e.target.value,
                        })
                      }
                      className="min-h-[100px] border-gray-200 focus:ring-indigo-500/20 resize-none"
                      placeholder="Any additional terms or restrictions"
                    />
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50/50">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 h-12 font-bold bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateTemplate}
                    className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    Update Template
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Toast */}
      {deleteConfirmation.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[320px]">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-sm font-bold text-gray-900">
                Delete Template?
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelDelete}
                className="h-5 w-5 p-0 text-gray-400 hover:text-gray-900"
              >
                ×
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this template? This action cannot
              be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancelDelete}
                className="flex-1 text-sm font-bold border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="flex-1 text-sm bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProtectionUsageView = () => {
  const [activeTab, setActiveTab] = useState("Current Alerts");

  // Alert Settings checkbox states
  const [tier1Recommended, setTier1Recommended] = useState(true);
  const [tier1SMS, setTier1SMS] = useState(false);
  const [tier2Digest, setTier2Digest] = useState(true);
  const [tier3Digest, setTier3Digest] = useState(true);
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelSMS, setChannelSMS] = useState(false);

  // Rapid Response checkbox states
  const [rapidResponseDecision, setRapidResponseDecision] = useState("");
  const [phase2Actions, setPhase2Actions] = useState({
    notifyTalent: false,
    briefLegal: false,
    draftResponse: false,
  });
  const [phase4Docs, setPhase4Docs] = useState({
    alertTimestamp: false,
    confidenceScores: false,
    dmcaProof: false,
    platformResponses: false,
    removalConfirmation: false,
  });

  const alerts = {
    critical: [
      {
        id: 1,
        type: "Deepfake - Fake Product Endorsement",
        talent: "Emma",
        platform: "YouTube",
        confidence: "94%",
        views: "177,000",
        posted: "1hr ago",
      },
    ],
    high: [
      { platform: "TikTok", issue: "Voice Clone Detected (81% confidence)" },
      { platform: "Instagram", issue: "Unauthorized Repost (95% confidence)" },
      { platform: "YouTube", issue: "Comment Spam (87% confidence)" },
    ],
    medium: 12,
    monitored: 47,
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Protect Your Talent's Likeness. Detect Threats Before They Spread.
        </h1>
        <p className="text-gray-600">
          Real-Time Deepfake Detection & Response Center
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6">
        <Card className="p-6 bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-gray-400" />
            <p className="text-sm text-gray-500">Active Talent Monitored</p>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">9</p>
          <p className="text-xs text-gray-500">Last scan: 2 min ago</p>
        </Card>

        <Card className="p-6 bg-white border border-gray-200 shadow-sm relative">
          <div className="absolute top-4 right-4">
            <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded uppercase">
              Active
            </span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            <p className="text-sm text-gray-500">Threats Detected (30 Days)</p>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">23</p>
          <p className="text-xs text-gray-500">5 CRITICAL • 8 HIGH</p>
        </Card>

        <Card className="p-6 bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-green-500" />
            <p className="text-sm text-gray-500">Takedown Success Rate</p>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">89%</p>
          <p className="text-xs text-gray-500">23/26 successful</p>
        </Card>
      </div>

      {/* Overall Status */}
      <Card className="p-4 bg-white border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-bold text-gray-900">Overall Status: GOOD</p>
              <p className="text-sm text-gray-500">
                Last full scan: Jan 28, 2025 at 2:30 PM • Next Scheduled: Jan
                28, 2025 at 5:00 PM
              </p>
            </div>
          </div>
          <Button variant="outline" className="font-bold border-gray-300">
            View All Alerts
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {[
            "Current Alerts",
            "How It Works",
            "Alert Settings",
            "Rapid Response",
            "Settings & Permissions",
            "Compliance & Reporting",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Sections */}
      {activeTab === "Current Alerts" && (
        <div className="space-y-6">
          {/* Critical Alert */}
          <Card className="p-6 bg-white border-2 border-red-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                CRITICAL (Requires Immediate Action)
              </h3>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex gap-4">
                <img
                  src={TALENT_DATA.find((t) => t.name === "Emma")?.img || ""}
                  alt="Emma"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-1">
                    [1] Deepfake - Fake Product Endorsement
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Talent: Emma | Platform: YouTube
                  </p>
                  <p className="text-sm text-gray-600">
                    Confidence: 94% | Views: 177,000 | Posted: 1hr ago
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button className="bg-gray-900 hover:bg-gray-800 text-white font-bold">
                  View Details
                </Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white font-bold">
                  Request Takedown
                </Button>
                <Button variant="outline" className="font-bold border-gray-300">
                  Snooze 24h
                </Button>
              </div>
            </div>
          </Card>

          {/* High Priority */}
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  HIGH PRIORITY (Review Today)
                </h3>
                <p className="text-sm text-gray-500">
                  4 items requiring attention
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="font-bold border-gray-300">
                  View All High Priority
                </Button>
                <Button variant="outline" className="font-bold border-gray-300">
                  Bulk Actions
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-bold text-gray-700 mb-2">Sample:</p>
              {alerts.high.map((alert, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{alert.platform}:</span>
                  <span className="text-gray-600">{alert.issue}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Medium Priority */}
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 rounded">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  MEDIUM PRIORITY (Review This Week)
                </h3>
                <p className="text-sm text-gray-500">
                  {alerts.medium} items | Most Recent: 3 hours ago
                </p>
              </div>
              <Button variant="outline" className="font-bold border-gray-300">
                View Weekly Digest
              </Button>
            </div>
            <p className="text-sm text-gray-600 ml-14">
              Includes low-confidence AI content, fan compilations, etc.
            </p>
          </Card>

          {/* Monitored */}
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gray-100 rounded">
                <Eye className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  MONITORED (Dashboard Only)
                </h3>
                <p className="text-sm text-gray-500">
                  {alerts.monitored} items | Licensed content, clear satire, old
                  archives
                </p>
              </div>
              <Button variant="outline" className="font-bold border-gray-300">
                View Monitored Items
              </Button>
            </div>
            <p className="text-sm text-gray-600 ml-14">
              These are catalogued but require no action
            </p>
          </Card>

          {/* Kanban Board */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Rapid Response Kanban
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" className="font-bold border-gray-300">
                  View as Kanban Board
                </Button>
                <Button variant="outline" className="font-bold border-gray-300">
                  View as List
                </Button>
                <Button variant="outline" className="font-bold border-gray-300">
                  <Download className="w-4 h-4 mr-2" /> Export All
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-gray-900 mb-1">DETECTED (New)</h4>
                <p className="text-3xl font-bold text-gray-900 mb-1">3</p>
                <p className="text-xs text-gray-500">New detections</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-gray-900 mb-1">
                  AWAITING DECISION
                </h4>
                <p className="text-3xl font-bold text-gray-900 mb-1">1</p>
                <p className="text-xs text-gray-500">Your review needed</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-gray-900 mb-1">
                  TAKEDOWN ACTIVE
                </h4>
                <p className="text-3xl font-bold text-gray-900 mb-1">2</p>
                <p className="text-xs text-gray-500">In progress</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-gray-900 mb-1">RESOLVED</h4>
                <p className="text-3xl font-bold text-gray-900 mb-1">47</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </div>

            <p className="text-sm text-gray-500 text-center mt-4">
              Drag to move through workflow | Click for details
            </p>
          </div>

          {/* Help Section */}
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Need Help?</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="font-bold border-gray-300">
                Contact Support
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                View Documentation
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Request Training Session
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Watch Demo Video
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Read FAQ
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Schedule Consultation with CSM
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* How It Works Tab */}
      {activeTab === "How It Works" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              What We're Protecting Against & How We Find It
            </h2>

            {/* Threat Categories */}
            <div className="space-y-6">
              {/* AI-Generated Content */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-900 text-white rounded flex items-center justify-center font-bold">
                    1
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    AI-GENERATED CONTENT
                  </h3>
                </div>

                <div className="ml-11 space-y-2">
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      <span className="font-bold">
                        Deepfakes (face manipulation)
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      <span className="font-bold">
                        Voice clones and audio synthesis
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      <span className="font-bold">
                        Fake endorsements and product placements
                      </span>
                    </p>
                  </div>
                </div>

                <div className="ml-11 mt-4 bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">Detection Speed:</span>{" "}
                    Near-instant scanning across 1000+ posts
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    <span className="font-bold">Sample:</span> YouTube deepfake
                    detected in 2 mins, flagged before reaching 1K views
                  </p>
                </div>
              </div>

              {/* Unauthorized Usage */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-900 text-white rounded flex items-center justify-center font-bold">
                    2
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    UNAUTHORIZED USAGE
                  </h3>
                </div>

                <div className="ml-11 space-y-2">
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      <span className="font-bold">
                        Unlicensed content repurposing
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      <span className="font-bold">Brand impersonation</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      <span className="font-bold">
                        Misattributed statements
                      </span>
                    </p>
                  </div>
                </div>

                <div className="ml-11 mt-4 bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">Platforms:</span> YouTube,
                    TikTok, Instagram, Twitter/X, Reddit, adult platforms,
                    blogs, forums, darkweb (enterprise)
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    <span className="font-bold">Accuracy:</span> Matching
                    against your approved license database
                  </p>
                </div>
              </div>

              {/* Reputational Threats */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-900 text-white rounded flex items-center justify-center font-bold">
                    3
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    REPUTATIONAL THREATS
                  </h3>
                </div>

                <div className="ml-11 space-y-2">
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      <span className="font-bold">
                        Manipulated statements (false admissions, political)
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      <span className="font-bold">
                        Deepfake intimate content (non-consensual)
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      <span className="font-bold">
                        Misleading AI avatars impersonating talent
                      </span>
                    </p>
                  </div>
                </div>

                <div className="ml-11 mt-4 bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">Why This Matters:</span> Can
                    cause lasting damage even after correction; requires
                    aggressive removal strategy
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Three-Layer Detection */}
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Our Three-Layer Detection
            </h2>

            <div className="space-y-6">
              {/* Layer 1 */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  LAYER 1: AUTOMATED SCANNING (Instant)
                </h3>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Facial recognition across 1000+ public posts daily
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Voice pattern matching for audio content
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Metadata analysis (timestamp/location inconsistencies)
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Engagement anomaly detection (unnatural viral spikes)
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">Result:</span> Initial flag with
                    confidence score
                  </p>
                </div>
              </div>

              {/* Layer 2 */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  LAYER 2: AI CREDIBILITY SCORING (Instant)
                </h3>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Lip-sync alignment analysis
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Eye movement and blinking patterns
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Audio waveform analysis (clipping, tonal consistency)
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Video artifact detection (compression signatures)
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">Result:</span> Confidence Score
                    0-100% (e.g., 94% likely fake)
                  </p>
                </div>
              </div>

              {/* Layer 3 */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  LAYER 3: HUMAN FORENSICS (2-Hour SLA)
                </h3>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      On-demand analyst review for borderline cases (60-80%
                      confidence)
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Context verification (cross-reference with talent's actual
                      schedule/location)
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Legal assessment for takedown eligibility
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">Result:</span> Final verdict +
                    recommended action (takedown, monitor, ignore)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Need Help Section */}
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Need Help?</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="font-bold border-gray-300">
                Contact Support
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                View Documentation
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Request Training Session
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Watch Demo Video
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Read FAQ
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Schedule Consultation with CSM
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Alert Settings Tab */}
      {activeTab === "Alert Settings" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Customize Detection & Notifications To Your Needs
            </h2>

            {/* Smart Notification Strategy */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-bold text-gray-900 mb-2">
                Smart Notification Strategy
              </h3>
              <p className="text-sm text-gray-700">
                We know platform relationships are fragile. High-volume
                notifications can flag you as spam. We've engineered smart
                filtering so you catch real threats without overwhelming your
                team or platform algorithms.
              </p>
            </div>

            {/* TIER 1: CRITICAL */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  TIER 1: CRITICAL
                </h3>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm">
                  <span className="font-bold">Notification:</span> Immediate
                  email + SMS + Slack + In-app
                </p>
                <p className="text-sm">
                  <span className="font-bold">Turnaround:</span> Instant (within
                  2 minutes)
                </p>
                <p className="text-sm">
                  <span className="font-bold">Digest or Individual:</span>{" "}
                  Individual notifications
                </p>
              </div>

              <div className="mb-4">
                <p className="text-sm font-bold mb-2">Triggers:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>
                    • Deepfake 85%+ accuracy (likely viral) (200K+ engagements)
                  </li>
                  <li>• Fake endorsement with commercial intent</li>
                  <li>• Non-consensual intimate content</li>
                  <li>• Defamatory statements (legal liability)</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="tier1-recommended"
                  checked={tier1Recommended}
                  onChange={(e) => setTier1Recommended(e.target.checked)}
                  className="w-4 h-4"
                />
                <label
                  htmlFor="tier1-recommended"
                  className="text-sm font-bold"
                >
                  Receive TIER 1 alerts (RECOMMENDED: ALWAYS ON)
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="tier1-sms"
                  checked={tier1SMS}
                  onChange={(e) => setTier1SMS(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="tier1-sms" className="text-sm">
                  Also send SMS (phone number on file)
                </label>
              </div>

              <Button className="mt-4 bg-gray-900 hover:bg-gray-800 text-white font-bold">
                Slack/Teams notification: Integrate Now
              </Button>
            </div>

            {/* TIER 2: HIGH */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  TIER 2: HIGH
                </h3>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm">
                  <span className="font-bold">Notification:</span> Daily digest:
                  email (9am or 5pm)
                </p>
                <p className="text-sm">
                  <span className="font-bold">Turnaround:</span> 24-hour review
                </p>
                <p className="text-sm">
                  <span className="font-bold">Digest or Individual:</span>{" "}
                  Grouped digest only
                </p>
              </div>

              <div className="mb-4">
                <p className="text-sm font-bold mb-2">Triggers:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Deepfake 75-89% confidence (not yet viral)</li>
                  <li>• AI voice in commercial context</li>
                  <li>• Stolen content (real footage, no permission)</li>
                  <li>• Bot-amplified engagement</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="tier2-digest"
                  checked={tier2Digest}
                  onChange={(e) => setTier2Digest(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="tier2-digest" className="text-sm font-bold">
                  Receive TIER 2 digests
                </label>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <label className="text-sm font-bold">Delivery Time:</label>
                <select className="px-3 py-1.5 border border-gray-200 rounded text-sm">
                  <option>9:00 AM</option>
                  <option>5:00 PM</option>
                </select>
              </div>
            </div>

            {/* TIER 3: MEDIUM */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-100 rounded">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  TIER 3: MEDIUM
                </h3>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm">
                  <span className="font-bold">Notification:</span> Weekly digest
                  + Dashboard
                </p>
                <p className="text-sm">
                  <span className="font-bold">Turnaround:</span> 3-5 day review
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="tier3-digest"
                  checked={tier3Digest}
                  onChange={(e) => setTier3Digest(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="tier3-digest" className="text-sm font-bold">
                  Receive TIER 3 digests
                </label>
              </div>
            </div>

            {/* Notification Channel Preferences */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Notification Channel Preferences
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                How do you want to be alerted?
              </p>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="channel-email"
                    checked={channelEmail}
                    onChange={(e) => setChannelEmail(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="channel-email" className="text-sm font-bold">
                    Email
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="channel-sms"
                    checked={channelSMS}
                    onChange={(e) => setChannelSMS(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="channel-sms" className="text-sm">
                    SMS (TIER 1 only)
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mb-6">
                <Button className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-bold">
                  Slack Integration - Connect Now
                </Button>
                <Button className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-bold">
                  Teams Integration - Connect Now
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Primary Email
                  </label>
                  <input
                    type="email"
                    placeholder="email@agency.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Backup Email
                  </label>
                  <input
                    type="email"
                    placeholder="backup@agency.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    SMS Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+1-555-XXX-XXXX"
                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Need Help Section */}
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Need Help?</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="font-bold border-gray-300">
                Contact Support
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                View Documentation
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Request Training Session
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Watch Demo Video
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Read FAQ
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Schedule Consultation with CSM
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Settings & Permissions Tab */}
      {activeTab === "Settings & Permissions" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Settings & Permissions
            </h2>

            {/* Team Structure */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Team Structure
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Set up your agency team:
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Primary Account Owner
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded text-sm mb-1">
                    <option>Select user</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    └─ Full access to all features
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Talent Liaison Officer
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded text-sm mb-1">
                    <option>Select user</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    └─ Reviews all TIER 1 alerts
                  </p>
                  <p className="text-xs text-gray-500">
                    └─ Can request takedowns
                  </p>
                  <p className="text-xs text-gray-500">
                    └─ Export & share reports
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Legal Counsel
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded text-sm mb-1">
                    <option>Select user</option>
                  </select>
                  <p className="text-xs text-gray-500">└─ View all alerts</p>
                  <p className="text-xs text-gray-500">
                    └─ Export forensic reports
                  </p>
                  <p className="text-xs text-gray-500">└─ Archive cases</p>
                </div>

                <Button className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-bold">
                  + Add Team Member
                </Button>
              </div>
            </div>

            {/* Role-Based Permissions Matrix */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Role-Based Permissions Matrix
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-bold text-gray-900">
                        Permission
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-bold text-gray-900">
                        Liaison
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-bold text-gray-900">
                        Legal
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-bold text-gray-900">
                        Social Mgr
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-bold text-gray-900">
                        Owner
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 px-4 text-sm text-gray-700">
                        View all alerts
                      </td>
                      <td className="text-center py-3 px-4">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                      </td>
                      <td className="text-center py-3 px-4">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                          <X className="w-3 h-3 text-gray-400 opacity-50" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 px-4 text-sm text-gray-700">
                        Request takedown
                      </td>
                      <td className="text-center py-3 px-4">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                          <X className="w-3 h-3 text-gray-400 opacity-50" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                          <X className="w-3 h-3 text-gray-400 opacity-50" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 px-4 text-sm text-gray-700">
                        Export reports
                      </td>
                      <td className="text-center py-3 px-4">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                      </td>
                      <td className="text-center py-3 px-4">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                          <X className="w-3 h-3 text-gray-400 opacity-50" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        Manage team members
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                          <X className="w-3 h-3 text-gray-400 opacity-50" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                          <X className="w-3 h-3 text-gray-400 opacity-50" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="w-5 h-5 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                          <X className="w-3 h-3 text-gray-400 opacity-50" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                Save Permissions
              </Button>
            </div>
          </div>

          {/* Need Help Section */}
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Need Help?</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="font-bold border-gray-300">
                Contact Support
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                View Documentation
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Request Training Session
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Watch Demo Video
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Read FAQ
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Schedule Consultation with CSM
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab !== "Current Alerts" &&
        activeTab !== "How It Works" &&
        activeTab !== "Alert Settings" &&
        activeTab !== "Settings & Permissions" &&
        activeTab !== "Rapid Response" &&
        activeTab !== "Compliance & Reporting" && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              Content for "{activeTab}" tab coming soon...
            </p>
          </div>
        )}

      {/* Rapid Response Tab */}
      {activeTab === "Rapid Response" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              From Detection to Takedown: Your 4-Phase Action Plan
            </h2>

            {/* PHASE 1: IMMEDIATE (0-2 hours) */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                PHASE 1: IMMEDIATE (0-2 hours)
              </h3>

              <div className="mb-4">
                <p className="text-sm font-bold mb-2">Likelee Does:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>✓ Confirms alert with human analyst</li>
                  <li>
                    ✓ Generates forensic report (metadata, confidence, platform
                    violations)
                  </li>
                  <li>✓ Pre-packages DMCA evidence</li>
                  <li>✓ Assigns dedicated liaison to your team</li>
                </ul>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-bold mb-2">
                  FORENSIC REPORT READY FOR YOUR DECISION
                </p>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-bold">Talent:</span> Emma
                  </p>
                  <p>
                    <span className="font-bold">Platform:</span> YouTube Shorts
                  </p>
                  <p>
                    <span className="font-bold">Content Type:</span> Deepfake
                    (Fake Product Endorsement)
                  </p>
                  <p>
                    <span className="font-bold">Confidence Score:</span> 94%
                  </p>
                  <p>
                    <span className="font-bold">Viral Status:</span> 127K views
                    | 3.2K shares | 18 hours old
                  </p>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-bold mb-2">RECOMMENDED ACTIONS:</p>
                  <div className="flex gap-2">
                    <Button className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm">
                      REQUEST TAKEDOWN NOW
                    </Button>
                    <Button
                      variant="outline"
                      className="font-bold border-gray-300 text-sm"
                    >
                      Monitor 24h
                    </Button>
                    <Button
                      variant="outline"
                      className="font-bold border-gray-300 text-sm"
                    >
                      Contact Liaison
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-gray-600 mt-3">
                  Reasoning: Viral trajectory suggests 500K+ views by 36h
                </p>

                <div className="mt-4">
                  <p className="text-sm font-bold mb-2">Forensic Details:</p>
                  <ul className="text-xs space-y-1 ml-4 text-gray-700">
                    <li>• Lip-sync misalignment: 78% deviation detected</li>
                    <li>• Audio artifacts: Clipping in word patterns</li>
                    <li>
                      • Background consistency: Lighting inconsistent (AI flag)
                    </li>
                    <li>
                      • Engagement pattern: 400% above talent's historical avg
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold mb-2">Your Decision:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="decision-now"
                      name="rapid-decision"
                      checked={rapidResponseDecision === "now"}
                      onChange={() => setRapidResponseDecision("now")}
                      className="w-4 h-4"
                    />
                    <label htmlFor="decision-now" className="text-sm">
                      Request Takedown Now
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="decision-24h"
                      name="rapid-decision"
                      checked={rapidResponseDecision === "24h"}
                      onChange={() => setRapidResponseDecision("24h")}
                      className="w-4 h-4"
                    />
                    <label htmlFor="decision-24h" className="text-sm">
                      Monitor for 24 Hours
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="decision-info"
                      name="rapid-decision"
                      checked={rapidResponseDecision === "info"}
                      onChange={() => setRapidResponseDecision("info")}
                      className="w-4 h-4"
                    />
                    <label htmlFor="decision-info" className="text-sm">
                      Request More Information
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="decision-snooze"
                      name="rapid-decision"
                      checked={rapidResponseDecision === "snooze"}
                      onChange={() => setRapidResponseDecision("snooze")}
                      className="w-4 h-4"
                    />
                    <label htmlFor="decision-snooze" className="text-sm">
                      Snooze & Review Later
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* PHASE 2: ESCALATION (2-12 hours) */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                PHASE 2: ESCALATION (2-12 hours)
              </h3>

              <div className="mb-4">
                <p className="text-sm mb-2">If You Requested Takedown:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>
                    ✓ Likelee submits certified DMCA to platform within 60 min
                  </li>
                  <li>✓ Real-time status tracking begins</li>
                  <li>
                    ✓ You receive updates every 2 hours during peak escalation
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-bold mb-2">
                  Your Action Items (Template Provided):
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="action-notify"
                      checked={phase2Actions.notifyTalent}
                      onChange={(e) =>
                        setPhase2Actions({
                          ...phase2Actions,
                          notifyTalent: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <label htmlFor="action-notify" className="text-sm">
                      Notify affected talent (copy provided)
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="action-brief"
                      checked={phase2Actions.briefLegal}
                      onChange={(e) =>
                        setPhase2Actions({
                          ...phase2Actions,
                          briefLegal: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <label htmlFor="action-brief" className="text-sm">
                      Brief legal/PR team (pre-written talking points)
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="action-draft"
                      checked={phase2Actions.draftResponse}
                      onChange={(e) =>
                        setPhase2Actions({
                          ...phase2Actions,
                          draftResponse: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <label htmlFor="action-draft" className="text-sm">
                      Draft response statement (template ready)
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-bold text-sm">
                    Share Action Plan with Team
                  </Button>
                  <Button className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-bold text-sm">
                    Send Email to Talent
                  </Button>
                  <Button className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-bold text-sm">
                    Notify Counsel
                  </Button>
                </div>
              </div>
            </div>

            {/* PHASE 3: PLATFORM RESPONSE (12-72 hours) */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                PHASE 3: PLATFORM RESPONSE (12-72 hours)
              </h3>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-bold mb-2">
                  TAKEDOWN REQUEST #LK-2024-11847
                </p>
                <p className="text-sm mb-2">
                  <span className="font-bold">Status:</span> SUBMITTED (TO
                  PLATFORM) (2 hours ago)
                </p>
                <p className="text-sm mb-2">
                  <span className="font-bold">Platform:</span> YouTube
                </p>

                <div className="space-y-1 text-sm mt-3">
                  <p>✓ Detection: Nov 15, 10:54 AM</p>
                  <p>✓ Analysis: Nov 15, 10:52 AM</p>
                  <p>✓ Your Decision: Nov 15, 10:59 AM</p>
                  <p>✓ DMCA Submitted: Nov 15, 1:12 AM</p>
                  <p className="text-orange-600">
                    ⏳ Awaiting Platform: Nov 15, 2:15 PM (current)
                  </p>
                </div>

                <p className="text-sm font-bold mt-3 mb-1">
                  Estimated Resolution: Nov 16, 10:00 AM (24h SLA)
                </p>
                <p className="text-sm font-bold mb-2">Possible Outcomes:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>– Content Removed</li>
                  <li>– Content Kept / Appeal Required</li>
                  <li>– Partial Action</li>
                </ul>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="font-bold border-gray-300 text-sm"
                  >
                    View DMCA Details
                  </Button>
                  <Button
                    variant="outline"
                    className="font-bold border-gray-300 text-sm"
                  >
                    Contact Support
                  </Button>
                </div>
              </div>
            </div>

            {/* PHASE 4: POST-REMOVAL (Days 3-30) */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                PHASE 4: POST-REMOVAL (Days 3-30)
              </h3>

              <div className="mb-4">
                <p className="text-sm font-bold mb-2">
                  Outcome A: Content Removed
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>✓ Removal confirmed & certified</li>
                  <li>✓ Re-upload monitoring begins (catches 2nd accounts)</li>
                  <li>✓ Final case report generated for legal file</li>
                </ul>
                <Button className="mt-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm">
                  RESOLVED - REMOVAL CONFIRMED
                </Button>
              </div>

              <div className="mb-4">
                <p className="text-sm font-bold mb-2">
                  Outcome B: Content Kept / Appeal Required
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>✓ Platform's rejection reason analyzed</li>
                  <li>✓ Stronger evidence re-packaged</li>
                  <li>✓ Appeal resubmitted within 24 hours</li>
                </ul>
                <Button className="mt-2 bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm">
                  UNDER APPEAL
                </Button>
              </div>

              <div className="mb-4">
                <p className="text-sm font-bold mb-2">
                  Outcome C: Partial Removal
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>✓ Clips identified and escalated</li>
                  <li>✓ Remaining items targeted with new evidence</li>
                  <li>✓ Secondary review initiated</li>
                </ul>
                <Button className="mt-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm">
                  PARTIAL REMOVAL - ESCALATING
                </Button>
              </div>

              <div>
                <p className="text-sm font-bold mb-2">
                  Your Final Documentation Package:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="doc-timestamp"
                      checked={phase4Docs.alertTimestamp}
                      onChange={(e) =>
                        setPhase4Docs({
                          ...phase4Docs,
                          alertTimestamp: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <label htmlFor="doc-timestamp" className="text-sm">
                      Original alert timestamp
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="doc-confidence"
                      checked={phase4Docs.confidenceScores}
                      onChange={(e) =>
                        setPhase4Docs({
                          ...phase4Docs,
                          confidenceScores: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <label htmlFor="doc-confidence" className="text-sm">
                      Confidence scores & forensic analysis
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="doc-dmca"
                      checked={phase4Docs.dmcaProof}
                      onChange={(e) =>
                        setPhase4Docs({
                          ...phase4Docs,
                          dmcaProof: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <label htmlFor="doc-dmca" className="text-sm">
                      DMCA submission proof
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="doc-platform"
                      checked={phase4Docs.platformResponses}
                      onChange={(e) =>
                        setPhase4Docs({
                          ...phase4Docs,
                          platformResponses: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <label htmlFor="doc-platform" className="text-sm">
                      Platform responses
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="doc-removal"
                      checked={phase4Docs.removalConfirmation}
                      onChange={(e) =>
                        setPhase4Docs({
                          ...phase4Docs,
                          removalConfirmation: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <label htmlFor="doc-removal" className="text-sm">
                      Removal confirmation
                    </label>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mt-3">
                  Purpose: Insurance claims, regulatory tracking, legal cases
                </p>

                <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  Download Complete Report
                </Button>
              </div>
            </div>
          </div>

          {/* Need Help Section */}
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Need Help?</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="font-bold border-gray-300">
                Contact Support
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                View Documentation
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Request Training Session
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Watch Demo Video
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Read FAQ
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Schedule Consultation with CSM
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Compliance & Reporting Tab */}
      {activeTab === "Compliance & Reporting" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Compliance & Reporting
            </h2>

            {/* Legal Documentation Center */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Legal Documentation Center
              </h3>

              <p className="text-sm mb-3">
                ✓ Built for AI-regulation landscape:
              </p>
              <ul className="text-sm space-y-1 ml-4 mb-4">
                <li>• California AB 730 (deepfake penalties)</li>
                <li>• Virginia SB/PA (synthetic voice protection)</li>
                <li>• EU Digital Services Act</li>
                <li>• Global NIL rights standards</li>
              </ul>

              <p className="text-sm font-bold mb-2">What Likelee Provides:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-900 rounded-sm flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm">
                    Timestamped detection records (admissible in court)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-900 rounded-sm flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm">
                    Chain of custody for forensic evidence
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-900 rounded-sm flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm">Platform takedown confirmations</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-900 rounded-sm flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm">DMCA-compliant documentation</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-900 rounded-sm flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm">Export-ready legal reports</p>
                </div>
              </div>
            </div>

            {/* QUARTERLY PERFORMANCE SUMMARY */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                QUARTERLY PERFORMANCE SUMMARY
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold mb-2">Total Alerts: 247</p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>├─ CRITICAL: 8 (100% escalated)</li>
                    <li>├─ HIGH: 34 (68% resulted in takedown)</li>
                    <li>├─ MEDIUM: 127 (23% resulted in takedown)</li>
                    <li>└─ LOW: 78 (monitored only)</li>
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-bold mb-2">
                    Takedown Success Rate: 89%
                  </p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>├─ Successful removals: 34</li>
                    <li>├─ Pending: 2</li>
                    <li>├─ Under appeal: 4</li>
                    <li>└─ Rejected: 1</li>
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Average Time to Removal: 18 hours
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold mb-2">
                    Top Threat Categories:
                  </p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>1. Deepfake endorsements (42%)</li>
                    <li>2. Voice clones (commercial) (28%)</li>
                    <li>3. Unauthorized reposts (18%)</li>
                    <li>4. Intimate deepfakes (7%)</li>
                    <li>5. Political misattribution (5%)</li>
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-bold mb-2">Platform Breakdown:</p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• YouTube: 89 alerts (36%)</li>
                    <li>• TikTok: 71 alerts (29%)</li>
                    <li>• Instagram: 54 alerts (22%)</li>
                    <li>• Twitter/X: 21 alerts (8%)</li>
                    <li>• Other: 12 alerts (5%)</li>
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-bold mb-2">
                    Financial Impact Prevented:
                  </p>
                  <p className="text-sm ml-4">
                    Estimated brand damage avoided: $2.4M (based on viral
                    trajectory analysis)
                  </p>
                </div>

                <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  Export Quarterly Report (PDF)
                </Button>
              </div>

              {/* Average Time to Removal */}
              <div className="mt-6">
                <p className="text-sm font-bold mb-2">
                  Average Time to Removal: 18 hours
                </p>

                <p className="text-sm font-bold mb-2">
                  Platform Performance Breakdown:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>├─ YouTube: 12h avg (94% success) 🟢</li>
                  <li>├─ TikTok: 18h avg (87% success) 🟡</li>
                  <li>├─ Instagram: 27h avg (78% success) 🟡</li>
                  <li>└─ Twitter/X: 48h avg (92% success) 🟠</li>
                </ul>
              </div>

              {/* Most Common Threat Type */}
              <div className="mt-6">
                <p className="text-sm font-bold mb-2">
                  Most Common Threat Type:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>1. Deepfake Endorsements (35%)</li>
                  <li>2. Voice Clones (28%)</li>
                  <li>3. Unauthorized Reposts (22%)</li>
                  <li>4. Impersonation (15%)</li>
                </ul>
              </div>
            </div>

            {/* Generate Reports */}
            <div className="border border-gray-200 rounded-lg p-6 mt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Generate Reports
              </h3>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="report-executive"
                    className="w-4 h-4"
                  />
                  <label htmlFor="report-executive" className="text-sm">
                    Monthly Executive Summary (For board/investor reports)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="report-forensic"
                    className="w-4 h-4"
                  />
                  <label htmlFor="report-forensic" className="text-sm">
                    Detailed Forensic Report (For legal team)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="report-takedown"
                    className="w-4 h-4"
                  />
                  <label htmlFor="report-takedown" className="text-sm">
                    Takedown History (For insurance claims, legal disputes)
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  Generate Report
                </Button>
                <Button variant="outline" className="font-bold border-gray-300">
                  Email to Team
                </Button>
                <Button variant="outline" className="font-bold border-gray-300">
                  Download
                </Button>
              </div>
            </div>
          </div>

          {/* Need Help Section */}
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Need Help?</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="font-bold border-gray-300">
                Contact Support
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                View Documentation
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Request Training Session
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Watch Demo Video
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Read FAQ
              </Button>
              <Button variant="outline" className="font-bold border-gray-300">
                Schedule Consultation with CSM
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const OVERVIEW_CARDS_DATA = [
  {
    title: "Consent Status",
    icon: ShieldCheck,
    iconColor: "text-green-500",
    stats: [
      { label: "Complete:", value: 8, color: "text-green-600" },
      { label: "Missing:", value: 1, color: "text-red-600" },
      { label: "Expiring:", value: 1, color: "text-orange-600" },
    ],
    progress: 80,
  },
  {
    title: "License Audit",
    icon: FileText,
    iconColor: "text-red-500",
    stats: [
      { label: "Active:", value: 9, color: "text-green-600" },
      { label: "Expiring Soon:", value: 0, color: "text-orange-600" },
      { label: "Expired:", value: 9, color: "text-red-600" },
    ],
    action: "ACTION REQUIRED",
    borderColor: "border-red-500",
    bgBadge: "bg-red-500",
  },
  {
    title: "Documentation",
    icon: Shield,
    iconColor: "text-indigo-500",
    stats: [
      { label: "In Compliance:", value: 8, color: "text-green-600" },
      { label: "Need Attention:", value: 2, color: "text-orange-600" },
    ],
    progress: 75,
  },
  {
    title: "Last Audit Date",
    icon: CheckCircle2,
    iconColor: "text-green-500",
    date: "Jan 15, 2025",
    status: "Up to date",
    footer: "Schedule Next Audit",
  },
];

const CONSENT_DATA = [
  {
    id: 1,
    name: "Emma",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    status: "compliant",
    consentDate: "2/16/2025",
    expiryDate: "8/15/2025",
    types: ["Video", "Image"],
  },
  {
    id: 2,
    name: "Sergine",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "compliant",
    consentDate: "3/26/2025",
    expiryDate: "9/22/2025",
    types: ["Image"],
  },
  {
    id: 3,
    name: "Milan",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    status: "compliant",
    consentDate: "1/31/2025",
    expiryDate: "7/30/2025",
    types: ["Video", "Image"],
  },
  {
    id: 4,
    name: "Julia",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    status: "warning",
    consentDate: "8/19/2024",
    expiryDate: "2/15/2025",
    types: ["Video", "Image", "Voice"],
  },
  {
    id: 5,
    name: "Matt",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
    status: "compliant",
    consentDate: "4/15/2025",
    expiryDate: "10/12/2025",
    types: ["Image", "Video"],
  },
  {
    id: 6,
    name: "Carla",
    image:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=150",
    status: "compliant",
    consentDate: "5/12/2025",
    expiryDate: "11/8/2025",
    types: ["Video", "Image"],
  },
  {
    id: 7,
    name: "Luisa",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
    status: "compliant",
    consentDate: "12/22/2024",
    expiryDate: "6/20/2025",
    types: ["Image", "Video"],
  },
  {
    id: 8,
    name: "Clemence",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150",
    status: "compliant",
    consentDate: "3/1/2025",
    expiryDate: "8/28/2025",
    types: ["Image"],
  },
  {
    id: 9,
    name: "Lina",
    image:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=150",
    status: "compliant",
    consentDate: "3/19/2025",
    expiryDate: "9/15/2025",
    types: ["Image"],
  },
  {
    id: 10,
    name: "Aaron",
    image:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150",
    status: "error",
    consentDate: "N/A",
    expiryDate: "N/A",
    types: ["N/A"],
  },
];

const LICENSE_COMPLIANCE_DATA = [
  {
    talent: "Emma",
    brand: "Glossier",
    scope: "Social Media",
    date: "2/16/2025",
    expiry: "8/15/2025",
    days: "Expired",
    level: "EXPIRED",
    auto: false,
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Sergine",
    brand: "Everlane",
    scope: "Social Media",
    date: "3/26/2025",
    expiry: "9/22/2025",
    days: "Expired",
    level: "EXPIRED",
    auto: true,
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Milan",
    brand: "Carhartt WIP",
    scope: "Social Media",
    date: "1/31/2025",
    expiry: "7/30/2025",
    days: "Expired",
    level: "EXPIRED",
    auto: false,
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Julia",
    brand: "& Other Stories",
    scope: "Social Media",
    date: "8/19/2024",
    expiry: "2/15/2025",
    days: "Expired",
    level: "EXPIRED",
    auto: true,
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Matt",
    brand: "Aesop",
    scope: "Social Media",
    date: "4/15/2025",
    expiry: "10/12/2025",
    days: "Expired",
    level: "EXPIRED",
    auto: false,
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Carla",
    brand: "Reformation",
    scope: "Social Media",
    date: "5/12/2025",
    expiry: "11/8/2025",
    days: "Expired",
    level: "EXPIRED",
    auto: true,
    image:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Luisa",
    brand: "Ganni",
    scope: "Social Media",
    date: "12/22/2024",
    expiry: "6/20/2025",
    days: "Expired",
    level: "EXPIRED",
    auto: false,
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Clemence",
    brand: "COS",
    scope: "Social Media",
    date: "3/1/2025",
    expiry: "8/28/2025",
    days: "Expired",
    level: "EXPIRED",
    auto: true,
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Lina",
    brand: "Sezane",
    scope: "Social Media",
    date: "3/19/2025",
    expiry: "9/15/2025",
    days: "Expired",
    level: "EXPIRED",
    auto: false,
    image:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=150",
  },
];

const DOCS_CHECKLIST = [
  {
    talent: "Emma",
    id: true,
    tax: true,
    consent: true,
    contract: true,
    bank: true,
    status: "Complete",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Sergine",
    id: true,
    tax: true,
    consent: true,
    contract: true,
    bank: true,
    status: "Complete",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Milan",
    id: true,
    tax: true,
    consent: true,
    contract: true,
    bank: true,
    status: "Complete",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Julia",
    id: true,
    tax: true,
    consent: false,
    contract: true,
    bank: true,
    status: "Pending",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Matt",
    id: true,
    tax: true,
    consent: true,
    contract: true,
    bank: true,
    status: "Complete",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Carla",
    id: true,
    tax: true,
    consent: true,
    contract: true,
    bank: true,
    status: "Complete",
    image:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Luisa",
    id: true,
    tax: true,
    consent: true,
    contract: true,
    bank: true,
    status: "Complete",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Clemence",
    id: true,
    tax: true,
    consent: true,
    contract: true,
    bank: true,
    status: "Complete",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Lina",
    id: true,
    tax: true,
    consent: true,
    contract: true,
    bank: true,
    status: "Complete",
    image:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=150",
  },
  {
    talent: "Aaron",
    id: false,
    tax: false,
    consent: false,
    contract: false,
    bank: false,
    status: "Pending",
    image:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150",
  },
];

const BRAND_USAGE = [
  { brand: "Glossier", count: "12 authorized uses", status: "Compliant" },
  { brand: "Reformation", count: "8 authorized uses", status: "Compliant" },
  { brand: "Carhartt WIP", count: "6 authorized uses", status: "Compliant" },
];

const ComplianceHubView = () => {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [alertSettings, setAlertSettings] = useState({
    "30day": true,
    "60day": true,
    "90day": true,
  });

  const [selectedTalentIds, setSelectedTalentIds] = useState<number[]>([]);
  const [licenseComplianceData, setLicenseComplianceData] = useState(
    LICENSE_COMPLIANCE_DATA,
  );

  const handleActionToast = (message: string) => {
    toast({
      title: "Action Required",
      description: message,
      action: (
        <ToastAction altText="Try again" onClick={() => {}}>
          OK
        </ToastAction>
      ),
    });
  };

  const handleSelectAllExpiring = () => {
    const expiredOrExpiring = CONSENT_DATA.filter(
      (t) => t.status === "warning" || t.status === "error",
    ).map((t) => t.id);

    // If all are already selected, clear selection. Otherwise, select all.
    if (expiredOrExpiring.every((id) => selectedTalentIds.includes(id))) {
      setSelectedTalentIds([]);
    } else {
      setSelectedTalentIds(expiredOrExpiring);
    }
  };

  const handleSendRenewalRequests = () => {
    if (selectedTalentIds.length === 0) return;

    toast({
      title: "Send Renewal Requests?",
      description: `You are about to send renewal requests to ${selectedTalentIds.length} talent. Proceed?`,
      action: (
        <ToastAction
          altText="OK"
          onClick={() => {
            toast({
              title: "Requests Sent",
              description: `Renewal requests have been sent to ${selectedTalentIds.length} selected talent.`,
              action: <ToastAction altText="OK">OK</ToastAction>,
            });
            setSelectedTalentIds([]);
          }}
        >
          OK
        </ToastAction>
      ),
    });
  };

  const toggleAutoRenew = (talentName: string) => {
    setLicenseComplianceData((prev) =>
      prev.map((item) =>
        item.talent === talentName ? { ...item, auto: !item.auto } : item,
      ),
    );
  };

  return (
    <div className="space-y-6 pb-20 scroll-smooth">
      <div className="flex justify-between items-center py-2 mb-2">
        <h2 className="text-2xl font-bold text-gray-900">Compliance Hub</h2>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2 border-gray-300 font-bold bg-white h-10"
            onClick={() =>
              handleActionToast(
                "Downloading compliance certificate for agency records...",
              )
            }
          >
            <ShieldCheck className="w-4 h-4" /> Download Compliance Certificate
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-gray-300 font-bold bg-white h-10"
            onClick={() => handleActionToast("Exporting report as PDF...")}
          >
            <Download className="w-4 h-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-6">
        {OVERVIEW_CARDS_DATA.map((card, idx) => (
          <Card
            key={idx}
            className={`p-6 bg-white border ${card.borderColor || "border-gray-200"} shadow-sm relative overflow-hidden`}
          >
            <div className="flex items-center gap-3 mb-4">
              <card.icon className={`w-6 h-6 ${card.iconColor}`} />
              <h3 className="text-sm font-bold text-gray-700">{card.title}</h3>
              {card.borderColor && (
                <div className="absolute top-4 right-4 animate-pulse">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
              )}
            </div>

            {card.stats ? (
              <div className="space-y-2 mb-4">
                {card.stats.map((stat, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex justify-between items-center text-xs"
                  >
                    <span className="text-gray-500 font-medium">
                      {stat.label}
                    </span>
                    <span className={`font-bold ${stat.color}`}>
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-2xl font-bold text-gray-900">{card.date}</p>
                <p className="text-xs font-bold text-green-500 flex items-center gap-1 mt-1">
                  ✓ {card.status}
                </p>
              </div>
            )}

            {card.progress !== undefined && (
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${card.progress > 75 ? "bg-gray-900" : "bg-indigo-600"}`}
                  style={{ width: `${card.progress}%` }}
                ></div>
              </div>
            )}

            {card.action && (
              <div
                className={`mt-2 ${card.bgBadge} text-white text-[10px] font-bold py-1.5 rounded text-center tracking-wider flex items-center justify-center gap-2`}
              >
                <AlertCircle className="w-3 h-3" /> {card.action}
              </div>
            )}

            {card.footer && (
              <p className="text-[10px] font-bold text-indigo-600 text-center mt-4 cursor-pointer hover:underline">
                {card.footer}
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Talent Consent Audit */}
      <Card className="p-0 border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">
            Talent Consent Audit
          </h3>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="text-xs font-bold border-gray-300 h-8"
              onClick={handleSelectAllExpiring}
            >
              Select All Expiring
            </Button>
            <Button
              disabled={selectedTalentIds.length === 0}
              variant="outline"
              className={`text-xs font-bold h-8 gap-2 ${
                selectedTalentIds.length === 0
                  ? "text-indigo-400 border-indigo-100 bg-indigo-50/30"
                  : "text-indigo-700 border-indigo-300 bg-indigo-50 hover:bg-indigo-100"
              }`}
              onClick={handleSendRenewalRequests}
            >
              <RefreshCw
                className={`w-3 h-3 ${selectedTalentIds.length > 0 ? "animate-spin-slow" : ""}`}
              />{" "}
              Send Renewal Requests ({selectedTalentIds.length})
            </Button>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {CONSENT_DATA.map((talent) => (
            <div
              key={talent.id}
              className={`p-4 flex items-center gap-6 ${talent.status === "warning" ? "bg-orange-50/30 border-y border-orange-200/50" : talent.status === "error" ? "bg-red-50/30 border-y border-red-200/50" : "hover:bg-gray-50/50"} transition-colors`}
            >
              <Checkbox
                className="border-gray-300"
                checked={selectedTalentIds.includes(talent.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedTalentIds((prev) => [...prev, talent.id]);
                  } else {
                    setSelectedTalentIds((prev) =>
                      prev.filter((id) => id !== talent.id),
                    );
                  }
                }}
              />
              <div className="flex items-center gap-3 min-w-[150px]">
                <img
                  src={talent.image}
                  alt={talent.name}
                  className="w-10 h-10 rounded-full object-cover border border-gray-100"
                />
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-900">{talent.name}</span>
                  {talent.status === "compliant" && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                  {talent.status === "warning" && (
                    <Clock className="w-4 h-4 text-orange-500" />
                  )}
                  {talent.status === "error" && (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              <div className="flex-1 flex gap-8 text-[11px] font-medium text-gray-500">
                <div className="flex flex-col gap-1">
                  <span className="text-gray-400 text-[10px] uppercase tracking-wider">
                    Consent Date
                  </span>
                  <span className="text-gray-700 font-bold">
                    {talent.consentDate}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-gray-400 text-[10px] uppercase tracking-wider">
                    Expiry Date
                  </span>
                  <span
                    className={`${talent.status === "warning" || talent.status === "error" ? "text-orange-600" : "text-gray-700"} font-bold`}
                  >
                    {talent.expiryDate}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-gray-400 text-[10px] uppercase tracking-wider">
                    Consent Types
                  </span>
                  <div className="flex gap-2 mt-0.5">
                    {talent.types.map((type, tIdx) => (
                      <span
                        key={tIdx}
                        className={`px-2 py-0.5 rounded-sm font-bold text-[9px] ${type === "N/A" ? "bg-gray-100 text-gray-400" : "bg-gray-900 text-white uppercase"}`}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(talent.status === "warning" || talent.status === "error") && (
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] h-8 px-4 font-bold rounded-md">
                    Request Renewal
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* License Compliance */}
      <Card className="p-0 border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">
            License Compliance
          </h3>
          <div className="flex gap-2">
            {[
              "30-day alerts: ON",
              "60-day alerts: ON",
              "90-day alerts: ON",
            ].map((alert) => (
              <span
                key={alert}
                className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100"
              >
                {alert}
              </span>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="px-6 py-4">Talent</th>
                <th className="px-4 py-4">Brand</th>
                <th className="px-4 py-4">Usage Scope</th>
                <th className="px-4 py-4">License Date</th>
                <th className="px-4 py-4">Expiry Date</th>
                <th className="px-4 py-4">Days Left</th>
                <th className="px-4 py-4">Alert Level</th>
                <th className="px-4 py-4">Auto-Renew</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
              {licenseComplianceData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={row.image}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="font-bold">{row.talent}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">{row.brand}</td>
                  <td className="px-4 py-4">{row.scope}</td>
                  <td className="px-4 py-4">{row.date}</td>
                  <td className="px-4 py-4">{row.expiry}</td>
                  <td className="px-4 py-4 text-red-600 font-bold">
                    {row.days}
                  </td>
                  <td className="px-4 py-4">
                    <span className="bg-red-50 text-red-600 text-[9px] px-2 py-1 rounded font-black tracking-tighter">
                      {row.level}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div
                      className={`w-8 h-4 rounded-full relative ${row.auto ? "bg-indigo-600" : "bg-gray-200"} transition-colors cursor-pointer`}
                      onClick={() => toggleAutoRenew(row.talent)}
                    >
                      <div
                        className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${row.auto ? "left-[17px]" : "left-0.5"}`}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-blue-600">
                    <button className="font-bold text-[10px] border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 text-gray-700">
                      Renew
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-indigo-50/30 border-t border-indigo-100 text-[10px] text-gray-500 font-medium">
          <p className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-900">Automated Alerts:</span>{" "}
            Email notifications sent automatically at 90, 60, and 30 days before
            license expiry.
          </p>
          <p className="flex items-center gap-2">
            <span className="font-bold text-gray-900">Auto-Renew:</span> When
            enabled, license renewal requests are automatically sent 30 days
            before expiry.
          </p>
        </div>
      </Card>

      {/* Talent Documentation Checklist */}
      <Card className="p-0 border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">
            Talent Documentation Checklist
          </h3>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="text-xs font-bold border-gray-300 h-8 gap-2"
              onClick={() =>
                handleActionToast("Exporting documentation checklist as CSV...")
              }
            >
              <Download className="w-4 h-4" /> Export Checklist
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-8 gap-2"
              onClick={() =>
                handleActionToast(
                  "Bulk upload for all - File picker would open here",
                )
              }
            >
              <RefreshCw className="w-4 h-4" /> Bulk Upload Docs
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-5 divide-x divide-gray-100 border-b border-gray-100">
          {[
            "ID Verification",
            "Tax Docs",
            "Consent Forms",
            "Contracts",
            "Bank Info",
          ].map((tab) => (
            <div
              key={tab}
              className="p-4 flex flex-col items-center gap-2 group cursor-pointer hover:bg-gray-50/50 transition-all"
              onClick={() =>
                handleActionToast(
                  `Bulk upload for ${tab.replace("Info", "Info")} - File picker would open here`,
                )
              }
            >
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors">
                <FileText className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase">
                  Upload
                </p>
                <p className="text-[11px] font-bold text-gray-800">{tab}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-100/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="px-6 py-4">Talent</th>
                <th className="px-4 py-4 text-center">ID Verification</th>
                <th className="px-4 py-4 text-center">Tax Docs</th>
                <th className="px-4 py-4 text-center">Consent Forms</th>
                <th className="px-4 py-4 text-center">Contract</th>
                <th className="px-4 py-4 text-center">Bank Info</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium font-sans">
              {DOCS_CHECKLIST.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={row.image}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="font-bold">{row.talent}</span>
                    </div>
                  </td>
                  {[row.id, row.tax, row.consent, row.contract, row.bank].map(
                    (check, cIdx) => (
                      <td key={cIdx} className="px-4 py-4 text-center">
                        {check ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                        )}
                      </td>
                    ),
                  )}
                  <td className="px-4 py-4">
                    <div
                      className={`mx-auto w-max px-3 py-1 rounded-full text-[10px] font-bold ${row.status === "Complete" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}
                    >
                      {row.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Download className="w-4 h-4 text-indigo-400 mx-auto cursor-pointer hover:text-indigo-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Brand Usage Monitoring */}
      <Card className="p-0 border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">
            Brand Usage Monitoring
          </h3>
        </div>
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-3 gap-6">
            <div className="p-4 bg-green-50 border border-green-100 rounded-xl relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-xs font-bold text-green-700">
                  Authorized Usages
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">73</p>
              <p className="text-[10px] text-green-600 font-bold mt-1">
                Last 30 days
              </p>
            </div>
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-xs font-bold text-red-700">
                  Flagged Usage
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-[10px] text-red-600 font-bold mt-1">
                Requires attention
              </p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-bold text-blue-700">
                  Under Review
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">2</p>
              <p className="text-[10px] text-blue-600 font-bold mt-1">
                Pending approval
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900 px-1">
              Usage by Brand
            </h4>
            <div className="space-y-2">
              {BRAND_USAGE.map((brand, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gray-50/50 border border-gray-100 rounded-lg flex justify-between items-center group hover:bg-white hover:shadow-sm transition-all"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {brand.brand}
                    </p>
                    <p className="text-[11px] text-gray-500 font-medium">
                      {brand.count}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full group-hover:bg-green-100 transition-colors">
                    {brand.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-10 h-10 text-gray-200" />
            </div>
            <p className="text-sm font-bold text-gray-900 mb-1">
              No flagged usage detected
            </p>
            <p className="text-xs text-gray-400 font-medium">
              All brand usages are authorized and compliant
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

const RoyaltiesPayoutsView = () => {
  const [activeTab, setActiveTab] = useState("Commission Structure");
  const subTabs = [
    "Commission Structure",
    "Payout Preferences",
    "Commission Breakdown",
    "Payment History",
  ];

  const [selectedTier, setSelectedTier] = useState("All Tiers");
  const [showHistory, setShowHistory] = useState(false);
  const [isEditingDefaultRate, setIsEditingDefaultRate] = useState(false);
  const [defaultCommissionRate, setDefaultCommissionRate] = useState(15);

  const filteredTalent =
    selectedTier === "All Tiers"
      ? TALENT_DATA
      : TALENT_DATA.filter((t) => t.tier === selectedTier);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 border-b border-gray-100 rounded-xl">
        <h2 className="text-2xl font-bold text-gray-900">
          Commission & Payout Management
        </h2>
        <Button
          variant="outline"
          className="gap-2 border-gray-200 font-bold bg-white h-10 px-4 text-sm"
        >
          <Download className="w-4 h-4" /> Export Report
        </Button>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center border border-green-100">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm font-bold text-gray-500">
              Accrued This Month
            </p>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">$8,450</h3>
          <p className="text-xs font-bold text-green-600">Ready for payout</p>
        </Card>

        <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm font-bold text-gray-500">Pending Approval</p>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">$3,200</h3>
          <p className="text-xs font-bold text-gray-400">
            Awaiting brand confirmation
          </p>
        </Card>

        <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center border border-purple-100">
              <CheckCircle2 className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm font-bold text-gray-500">Paid YTD</p>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">$124,800</h3>
          <p className="text-xs font-bold text-gray-400">To Talent This year</p>
        </Card>

        <Card className="p-8 bg-indigo-50 border border-indigo-200 shadow-sm rounded-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-indigo-100 shadow-sm">
              <Percent className="w-6 h-6 text-indigo-600" />
            </div>
            <p className="text-sm font-bold text-indigo-500">
              Agency Commission YTD
            </p>
          </div>
          <h3 className="text-3xl font-bold text-indigo-900 mb-1">$18,720</h3>
          <p className="text-xs font-bold text-indigo-500">
            15% avg commission rate
          </p>
        </Card>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
        {subTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold transition-all rounded-lg ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Commission Structure" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          <Card className="p-10 bg-white border border-gray-900 shadow-sm rounded-xl">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-lg font-bold text-gray-900">
                Default Commission Rate
              </h3>
              {isEditingDefaultRate ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingDefaultRate(false);
                      setDefaultCommissionRate(15);
                    }}
                    className="font-bold border-gray-200"
                  >
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                  <Button
                    onClick={() => setIsEditingDefaultRate(false)}
                    className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                  >
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setIsEditingDefaultRate(true)}
                  className="font-bold gap-2"
                >
                  <Settings className="w-4 h-4" /> Edit Settings
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <Label className="text-sm font-bold text-gray-900">
                  Agency Commission Rate
                </Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-32">
                    <Input
                      type="number"
                      value={defaultCommissionRate}
                      onChange={(e) =>
                        isEditingDefaultRate &&
                        setDefaultCommissionRate(Number(e.target.value))
                      }
                      readOnly={!isEditingDefaultRate}
                      className={`h-14 bg-gray-50 border-gray-200 text-2xl font-bold text-gray-900 pl-4 pr-10 ${isEditingDefaultRate ? "bg-white border-indigo-500 ring-2 ring-indigo-100" : ""}`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">
                      %
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-500 italic">
                  Talent sees:{" "}
                  <span className="text-gray-900 font-bold">
                    "Agency takes {defaultCommissionRate}% commission"
                  </span>
                </p>
              </div>
              <div className="bg-indigo-50/50 p-8 rounded-2xl border border-indigo-100 flex flex-col justify-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                  Example Breakdown:
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-indigo-50">
                    <span className="text-sm font-bold text-gray-600">
                      License Deal:
                    </span>
                    <span className="text-sm font-black text-gray-900">
                      $1,000
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-indigo-50">
                    <span className="text-sm font-bold text-green-600">
                      Talent Receives:
                    </span>
                    <span className="text-sm font-black text-green-600">
                      ${(1000 * (1 - defaultCommissionRate / 100)).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 font-black text-indigo-600">
                    <span className="text-sm">Agency Commission:</span>
                    <span className="text-sm">
                      ${(1000 * (defaultCommissionRate / 100)).toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-10 bg-white border border-gray-900 shadow-sm rounded-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Commission by Performance Tier
            </h3>
            <p className="text-sm font-medium text-gray-500 mb-10">
              Set different commission rates based on talent performance tier.
              Higher-performing talent can earn lower commission rates as an
              incentive.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-[#FAF5FF] border border-purple-100 rounded-2xl space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-purple-900">
                    Premium Tier
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white border border-purple-200 rounded text-sm font-bold text-gray-500">
                      12
                    </span>
                    <span className="text-gray-400 font-bold">%</span>
                  </div>
                </div>
                <div className="w-full bg-purple-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-900 rounded-full"
                    style={{ width: "85%" }}
                  />
                </div>
              </div>

              <div className="p-8 bg-[#F0F9FF] border border-blue-100 rounded-2xl space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-blue-900">
                    Core Tier
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white border border-blue-200 rounded text-sm font-bold text-gray-500">
                      15
                    </span>
                    <span className="text-gray-400 font-bold">%</span>
                  </div>
                </div>
                <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-900 rounded-full"
                    style={{ width: "65%" }}
                  />
                </div>
              </div>

              <div className="p-8 bg-[#F0FDF4] border border-green-100 rounded-2xl space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-green-900">
                    Growth Tier
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white border border-green-200 rounded text-sm font-bold text-gray-500">
                      18
                    </span>
                    <span className="text-gray-400 font-bold">%</span>
                  </div>
                </div>
                <div className="w-full bg-green-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-900 rounded-full"
                    style={{ width: "45%" }}
                  />
                </div>
              </div>

              <div className="p-8 bg-gray-50 border border-gray-100 rounded-2xl space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-900">
                    Inactive Tier
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white border border-gray-200 rounded text-sm font-bold text-gray-500">
                      20
                    </span>
                    <span className="text-gray-400 font-bold">%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-900 rounded-full"
                    style={{ width: "10%" }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-900 shadow-sm overflow-hidden rounded-xl">
            <div className="p-10 border-b border-gray-100 flex justify-between items-center">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">
                  Talent Commission Settings
                </h3>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Set custom commission rates for specific talent when needed
                  (e.g., special contracts, VIP talent)
                </p>
              </div>
              <Button
                variant="outline"
                className="font-bold gap-2 border-gray-200"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? (
                  <>
                    <History className="w-4 h-4" /> Hide History
                  </>
                ) : (
                  <>
                    <History className="w-4 h-4" /> View History
                  </>
                )}
              </Button>
            </div>

            {showHistory ? (
              <div className="p-8 bg-gray-50/50">
                <div className="border border-blue-100 bg-[#F0F9FF] rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-blue-100">
                    <h4 className="text-sm font-bold text-gray-900">
                      Commission Changes History
                    </h4>
                  </div>
                  <div className="divide-y divide-blue-50">
                    {[
                      {
                        name: "Julia",
                        date: "Jan 20, 2025",
                        admin: "Admin",
                        oldRate: 15,
                        newRate: 12,
                      },
                      {
                        name: "Carla",
                        date: "Jan 15, 2025",
                        admin: "Admin",
                        oldRate: 15,
                        newRate: 10,
                      },
                      {
                        name: "Milan",
                        date: "Jan 10, 2025",
                        admin: "Admin",
                        oldRate: 18,
                        newRate: 15,
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 bg-white/50 hover:bg-white transition-colors"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.date} by {item.admin}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded bg-red-50 text-red-600 text-xs font-bold">
                            {item.oldRate}%
                          </span>
                          <span className="text-gray-300">→</span>
                          <span className="px-3 py-1 rounded bg-green-50 text-green-600 text-xs font-bold">
                            {item.newRate}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Filter by Tier:
                    </span>
                    <select
                      value={selectedTier}
                      onChange={(e) => setSelectedTier(e.target.value)}
                      className="h-10 px-4 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    >
                      <option value="All Tiers">All Tiers</option>
                      <option value="Premium">Premium</option>
                      <option value="Core">Core</option>
                      <option value="Growth">Growth</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <p className="text-xs font-medium text-gray-400 italic">
                    Showing {filteredTalent.length} of {TALENT_DATA.length}{" "}
                    talent
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-8 py-5 w-12 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                        <th className="px-8 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Talent
                        </th>
                        <th className="px-8 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Tier
                        </th>
                        <th className="px-8 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          30D Earnings
                        </th>
                        <th className="px-8 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Current Rate
                        </th>
                        <th className="px-8 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Custom Rate
                        </th>
                        <th className="px-8 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Last Changed
                        </th>
                        <th className="px-8 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-sans">
                      {filteredTalent.map((talent) => (
                        <tr
                          key={talent.id}
                          className="hover:bg-gray-50/30 transition-colors group"
                        >
                          <td className="px-8 py-5 text-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <img
                                src={talent.img}
                                className="w-10 h-10 rounded-lg object-cover shadow-sm bg-gray-100"
                              />
                              <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                                {talent.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <Badge
                              className={`px-2 py-0.5 font-bold text-[10px] uppercase shadow-sm ${talent.tier === "Premium" ? "bg-purple-50 text-purple-600" : talent.tier === "Core" ? "bg-blue-50 text-blue-600" : talent.tier === "Growth" ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-500"}`}
                            >
                              {talent.tier}
                            </Badge>
                          </td>
                          <td className="px-8 py-5 text-sm font-bold text-gray-900">
                            {talent.earnings}
                          </td>
                          <td className="px-8 py-5 text-sm font-bold text-gray-900">
                            {talent.tier === "Premium"
                              ? "12%"
                              : talent.tier === "Core"
                                ? "15%"
                                : talent.tier === "Growth"
                                  ? "18%"
                                  : "20%"}
                          </td>
                          <td className="px-8 py-5">
                            <div className="relative w-24">
                              <input
                                type="text"
                                placeholder={
                                  talent.tier === "Premium"
                                    ? "12"
                                    : talent.tier === "Core"
                                      ? "15"
                                      : talent.tier === "Growth"
                                        ? "18"
                                        : "20"
                                }
                                className="w-full h-10 bg-gray-50/50 border border-gray-100 rounded-lg pl-3 pr-8 text-sm font-bold text-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500/30 transition-all"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300">
                                %
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase italic">
                              Using default
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="font-medium text-indigo-600 hover:bg-indigo-50 px-4"
                            >
                              EDIT
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="p-8 bg-[#F0F7FF] flex items-center justify-between border-t border-indigo-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-indigo-100 shadow-sm text-indigo-600">
                  <Settings className="w-4 h-4" />
                </div>
                <p className="text-xs font-medium text-indigo-600">
                  Custom rates override tier-based defaults. Reset to use tier
                  default.
                </p>
              </div>
              <Button
                variant="ghost"
                className="font-bold text-xs text-gray-500 uppercase tracking-wider gap-2 hover:bg-white/50 border border-gray-200 px-6 h-10 shadow-sm"
              >
                <Download className="w-4 h-4" /> Export Settings
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "Payment History" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <div className="p-8 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                Top Earning Talent (Last 30 Days)
              </h3>
            </div>
            <div>
              {[
                {
                  name: "Carla",
                  campaigns: 13,
                  amount: 6800,
                  talent: 5984,
                  agency: 816,
                  img: TALENT_DATA.find((t) => t.id === "carla")?.img,
                },
                {
                  name: "Clemence",
                  campaigns: 10,
                  amount: 5400,
                  talent: 4752,
                  agency: 648,
                  img: TALENT_DATA.find((t) => t.id === "clemence")?.img,
                },
                {
                  name: "Julia",
                  campaigns: 11,
                  amount: 5200,
                  talent: 4576,
                  agency: 624,
                  img: TALENT_DATA.find((t) => t.id === "julia")?.img,
                },
                {
                  name: "Luisa",
                  campaigns: 8,
                  amount: 4200,
                  talent: 3570,
                  agency: 630,
                  img: TALENT_DATA.find((t) => t.id === "luisa")?.img,
                },
                {
                  name: "Milan",
                  campaigns: 9,
                  amount: 4100,
                  talent: 3485,
                  agency: 615,
                  img: TALENT_DATA.find((t) => t.id === "milan")?.img,
                },
                {
                  name: "Matt",
                  campaigns: 6,
                  amount: 3600,
                  talent: 3060,
                  agency: 540,
                  img: TALENT_DATA.find((t) => t.id === "matt")?.img,
                },
                {
                  name: "Emma",
                  campaigns: 7,
                  amount: 3200,
                  talent: 2720,
                  agency: 480,
                  img: TALENT_DATA.find((t) => t.id === "emma")?.img,
                },
                {
                  name: "Sergine",
                  campaigns: 5,
                  amount: 2800,
                  talent: 2296,
                  agency: 504,
                  img: TALENT_DATA.find((t) => t.id === "sergine")?.img,
                },
                {
                  name: "Lina",
                  campaigns: 4,
                  amount: 2400,
                  talent: 1968,
                  agency: 432,
                  img: TALENT_DATA.find((t) => t.id === "lina")?.img,
                },
              ].map((talent, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-6 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={talent.img}
                      alt={talent.name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        {talent.name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {talent.campaigns} campaigns
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="text-base font-bold text-gray-900">
                      ${talent.amount.toLocaleString()}
                    </h4>
                    <p className="text-[10px] font-bold text-gray-500">
                      <span className="text-green-600">
                        Talent: ${talent.talent.toLocaleString()}
                      </span>{" "}
                      •{" "}
                      <span className="text-indigo-600">
                        Agency: ${talent.agency}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "Payout Preferences" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              Payout Schedule Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">
                  Payout Frequency
                </Label>
                <Select defaultValue="Monthly">
                  <SelectTrigger className="h-12 bg-white border-gray-200">
                    <SelectValue placeholder="Select Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  How often talent receives payouts
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">
                  Minimum Payout Threshold
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                    $
                  </span>
                  <Input
                    defaultValue="50"
                    className="h-12 pl-8 border-gray-200"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Don't pay if balance is under this amount
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <div className="p-8 space-y-6">
              <h3 className="text-lg font-bold text-gray-900">Payout Method</h3>
              <div className="flex items-center justify-between p-6 bg-green-50/50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white border border-green-200 flex items-center justify-center text-green-600">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900">
                      Stripe Connected Account
                    </h4>
                    <p className="text-sm text-gray-500">
                      Auto-deduct commission, transfer net to talent
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-500 hover:bg-green-600 text-white border-none px-3 py-1 text-xs font-bold">
                  Active
                </Badge>
              </div>

              <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-xl">
                <h4 className="text-sm font-bold text-blue-900 mb-2">
                  How it works:
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>1. Brand pays license fee to agency Stripe account</li>
                  <li>2. Agency commission (14%) auto-deducted</li>
                  <li>
                    3. Net amount transferred to talent's connected account
                  </li>
                  <li>4. Automatic payout on schedule (monthly)</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <div className="p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                Upcoming Payout Schedule
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        Feb 1, 2025
                      </h4>
                      <p className="text-xs text-gray-500">Scheduled payout</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-bold text-gray-900">$8,450</h4>
                    <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white border-none text-[10px] font-bold">
                      scheduled
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        Mar 1, 2025
                      </h4>
                      <p className="text-xs text-gray-500">
                        Future payout date
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-bold text-gray-900">$0</h4>
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-500 border-none text-[10px] font-bold"
                    >
                      upcoming
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        Apr 1, 2025
                      </h4>
                      <p className="text-xs text-gray-500">
                        Future payout date
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-bold text-gray-900">$0</h4>
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-500 border-none text-[10px] font-bold"
                    >
                      upcoming
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "Commission Breakdown" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          <div className="mb-2">
            <h3 className="text-lg font-bold text-gray-900">
              Recent License Deal Breakdowns
            </h3>
            <p className="text-sm text-gray-500">
              Full transparency on how each license deal is split between talent
              and agency.
            </p>
          </div>

          {[
            {
              talent: "Carla",
              brand: "Reformation",
              date: "Jan 25, 2025",
              total: 3200,
              talentShare: 2720,
              agencyShare: 480,
            },
            {
              talent: "Julia",
              brand: "& Other Stories",
              date: "Jan 20, 2025",
              total: 2800,
              talentShare: 2380,
              agencyShare: 420,
            },
            {
              talent: "Milan",
              brand: "Carhartt WIP",
              date: "Jan 18, 2025",
              total: 2100,
              talentShare: 1785,
              agencyShare: 315,
            },
          ].map((deal, i) => (
            <Card
              key={i}
              className="p-6 bg-white border border-gray-200 shadow-sm rounded-lg"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-bold text-gray-900">
                      {deal.talent}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className="text-base font-medium text-gray-600">
                      {deal.brand}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{deal.date}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-900">
                    ${deal.total.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 mb-2">
                <div className="p-4 bg-white border border-gray-100 rounded-l-md">
                  <p className="text-xs font-bold text-gray-500 mb-1">
                    Total Deal Value
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    ${deal.total.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-green-50/30 border border-green-100">
                  <p className="text-xs font-bold text-gray-500 mb-1">
                    Talent Receives (85%)
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    ${deal.talentShare.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-r-md">
                  <p className="text-xs font-bold text-gray-500 mb-1">
                    Agency Commission (15%)
                  </p>
                  <p className="text-lg font-bold text-indigo-600">
                    ${deal.agencyShare.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="relative h-2 w-full flex rounded-full overflow-hidden mt-4">
                <div className="h-full bg-green-500 w-[85%]" />
                <div className="h-full bg-indigo-500 w-[15%]" />
              </div>
              <div className="flex justify-between mt-1 text-[10px] font-bold text-gray-400">
                <span className="w-[85%] text-right pr-1">85%</span>
                <span className="w-[15%] text-right">15%</span>
              </div>
            </Card>
          ))}

          <div className="p-8 bg-blue-50 border border-blue-100 rounded-xl">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Commission Transparency
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              This breakdown is visible to talent in their payment history and
              exported reports. Full transparency builds trust.
            </p>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="bg-white font-bold text-xs gap-2 border-gray-200"
              >
                <Settings className="w-4 h-4" /> Configure Display
              </Button>
              <Button
                variant="outline"
                className="bg-white font-bold text-xs gap-2 border-gray-200"
              >
                <Download className="w-4 h-4" /> Export All Breakdowns
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AnalyticsDashboardView = () => {
  const [activeTab, setActiveTab] = useState("Overview");
  const subTabs = [
    "Overview",
    "Roster Insights",
    "Clients & Campaigns",
    "Compliance",
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center bg-white p-6 border-b border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Analytics Dashboard
          </h2>
          <div className="flex bg-gray-100 p-1 rounded-xl mt-6 w-fit">
            {subTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-semibold transition-all rounded-lg ${
                  activeTab === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          className="gap-2 border-gray-200 font-bold bg-white h-10 px-4 text-sm hover:bg-gray-50 transition-all"
        >
          <Download className="w-4 h-4" /> Export Report
        </Button>
      </div>

      {activeTab === "Overview" ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Top Row - 2 Columns */}
          <div className="grid grid-cols-3 gap-6">
            {/* Total Earnings Card */}
            <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[420px]">
              <div className="relative z-10">
                <div className="mb-6 flex items-center justify-between">
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center border border-green-100">
                    <DollarSign className="w-7 h-7 text-green-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                  Total Earnings (30d)
                </p>
                <h3 className="text-5xl font-black text-gray-900 tracking-tighter mb-4">
                  $37,700
                </h3>
                <p className="text-xs font-bold text-green-600 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> +12% vs last period
                </p>
              </div>
            </Card>

            {/* Active Campaigns Card */}
            <Card className="col-span-2 p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start mb-10">
                <div className="flex gap-5 items-center">
                  <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                    <BarChart2 className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                      Active Campaigns
                    </p>
                    <h3 className="text-5xl font-black text-gray-900 tracking-tighter">
                      9
                    </h3>
                  </div>
                </div>
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-10">
                <div className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Total Value
                  </p>
                  <p className="text-2xl font-black text-gray-900">$37,700</p>
                </div>
                <div className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Avg Value
                  </p>
                  <p className="text-2xl font-black text-gray-900">$4,189</p>
                </div>
                <div className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Top Scope
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-black text-gray-900 tracking-tight">
                      Social Media
                    </p>
                    <span className="text-xs font-bold text-gray-500">42%</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-black text-gray-400 uppercase mb-5 tracking-[0.2em]">
                  Campaign Status Breakdown
                </p>
                <div className="space-y-6">
                  {ANALYTICS_CAMPAIGN_STATUS.map((status, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-black text-gray-600 tracking-wider">
                        <span className="uppercase">{status.name}</span>
                        <span>{status.value}</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-900"
                          style={{
                            width: `${(status.value / 15) * 100}%`,
                            backgroundColor: status.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Middle Section - Stacked Horizontal Cards */}
          <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden h-[180px] flex flex-col justify-center">
            <div className="flex justify-between items-center">
              <div>
                <div className="mb-4">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">
                  AI Usages (30d)
                </p>
                <h3 className="text-5xl font-black text-gray-900 tracking-tighter">
                  73
                </h3>
                <p className="text-xs font-bold text-purple-600 flex items-center gap-1.5 mt-2">
                  <TrendingUp className="w-3.5 h-3.5" /> +18% vs last period
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
                <BarChart2 className="w-7 h-7 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden h-[140px] flex flex-col justify-center">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Avg Campaign Value
                </p>
                <h3 className="text-4xl font-black text-gray-900 tracking-tighter">
                  $1,796
                </h3>
                <p className="text-xs font-bold text-orange-600 mt-2">
                  0 expiring soon
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-100">
                <Target className="w-7 h-7 text-orange-600" />
              </div>
            </div>
          </Card>

          {/* Monthly Performance Trends */}
          <Card className="p-8 bg-white border border-gray-900 shadow-sm">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-[0.15em]">
                Monthly Performance Trends
              </h3>
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={ANALYTICS_PERFORMANCE_TRENDS}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: "bold", fill: "#94a3b8" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: "bold", fill: "#94a3b8" }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontWeight: "bold",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{
                      paddingTop: "40px",
                      fontWeight: "bold",
                      fontSize: "12px",
                    }}
                    formatter={(value) => (
                      <span className="text-gray-600 uppercase tracking-widest">
                        {value}
                      </span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="earnings"
                    name="Earnings ($)"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#10b981",
                      strokeWidth: 2,
                      stroke: "#fff",
                    }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="campaigns"
                    name="Campaigns"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#6366f1",
                      strokeWidth: 2,
                      stroke: "#fff",
                    }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="usages"
                    name="AI Usages"
                    stroke="#a855f7"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#a855f7",
                      strokeWidth: 2,
                      stroke: "#fff",
                    }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Distribution Pie Charts */}
          <div className="grid grid-cols-2 gap-6 pb-10">
            <Card className="p-8 bg-white border border-gray-900 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 mb-10 uppercase tracking-[0.1em]">
                AI Usage Type Distribution
              </h3>
              <div className="flex flex-col items-center">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ANALYTICS_AI_USAGE_TYPE}
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius={100}
                        dataKey="value"
                        stroke="none"
                      >
                        {ANALYTICS_AI_USAGE_TYPE.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full mt-8 flex flex-col gap-3">
                  {ANALYTICS_AI_USAGE_TYPE.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                        {item.name}: {item.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white border border-gray-900 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 mb-10 uppercase tracking-[0.1em]">
                Consent Status Breakdown
              </h3>
              <div className="flex flex-col items-center">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ANALYTICS_CONSENT_STATUS}
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius={100}
                        dataKey="value"
                        stroke="none"
                      >
                        {ANALYTICS_CONSENT_STATUS.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full mt-8 flex flex-col gap-3 text-right">
                  {ANALYTICS_CONSENT_STATUS.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                        {item.name}: {item.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : activeTab === "Roster Insights" ? (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-[0.15em] mb-10">
            Earnings by Talent (Last 30 Days)
          </h3>
          <Card className="p-10 bg-white border border-gray-900 shadow-sm mb-8">
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ROSTER_INSIGHTS_DATA}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 13, fontWeight: "bold", fill: "#64748b" }}
                    dy={15}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 13, fontWeight: "bold", fill: "#94a3b8" }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontWeight: "bold",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="rect"
                    wrapperStyle={{
                      paddingTop: "40px",
                      fontWeight: "bold",
                      fontSize: "13px",
                    }}
                    formatter={(value) => (
                      <span className="text-gray-700 uppercase tracking-widest px-2">
                        {value === "earnings"
                          ? "30D Earnings ($)"
                          : "Projected ($)"}
                      </span>
                    )}
                  />
                  <Bar
                    dataKey="earnings"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                    name="earnings"
                  />
                  <Bar
                    dataKey="projected"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                    name="projected"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top Talent Summary Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <Card className="p-6 bg-white border border-gray-900 shadow-sm relative overflow-hidden">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">
                Top Performer (Earnings)
              </p>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-green-500 p-0.5">
                  <img
                    src={TALENT_DATA.find((t) => t.id === "carla")?.img}
                    alt="Carla"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div>
                  <h4 className="text-xl font-black text-gray-900 tracking-tight">
                    Carla
                  </h4>
                  <p className="text-2xl font-black text-green-600">$6,800</p>
                  <p className="text-[11px] font-bold text-gray-500 mt-1">
                    13 campaigns • 7.1% engagement
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-gray-900 shadow-sm relative overflow-hidden">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">
                Most Active (Campaigns)
              </p>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-indigo-500 p-0.5">
                  <img
                    src={TALENT_DATA.find((t) => t.id === "julia")?.img}
                    alt="Julia"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div>
                  <h4 className="text-xl font-black text-gray-900 tracking-tight">
                    Julia
                  </h4>
                  <p className="text-2xl font-black text-indigo-600">11 uses</p>
                  <p className="text-[11px] font-bold text-gray-500 mt-1">
                    $5,200 earnings • 6.2% engagement
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-gray-900 shadow-sm relative overflow-hidden">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">
                Highest Engagement
              </p>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-purple-500 p-0.5">
                  <img
                    src={TALENT_DATA.find((t) => t.id === "carla")?.img}
                    alt="Carla"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div>
                  <h4 className="text-xl font-black text-gray-900 tracking-tight">
                    Carla
                  </h4>
                  <p className="text-2xl font-black text-purple-600">7.1%</p>
                  <p className="text-[11px] font-bold text-gray-500 mt-1">
                    53,400 followers • 13 campaigns
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Talent Performance Metrics Table */}
          <Card className="bg-white border border-gray-900 shadow-sm overflow-hidden mb-8">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">
                Talent Performance Metrics
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                      Talent
                    </th>
                    <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                      30D Earnings
                    </th>
                    <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                      Campaigns
                    </th>
                    <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                      Avg Value
                    </th>
                    <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                      Engagement
                    </th>
                    <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {TALENT_DATA.filter((t) => t.status === "active")
                    .slice(0, 10)
                    .map((talent) => (
                      <tr
                        key={talent.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <img
                              src={talent.img}
                              alt={talent.name}
                              className="w-8 h-8 rounded-full object-cover border border-gray-200"
                            />
                            <span className="text-sm font-bold text-gray-900">
                              {talent.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-black text-gray-900">
                          {talent.earnings}
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-gray-600">
                          {Math.floor(Math.random() * 10) + 4}
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-gray-600">
                          ${Math.floor(Math.random() * 200) + 400}
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-gray-600">
                          {(Math.random() * 4 + 3).toFixed(1)}%
                        </td>
                        <td className="px-8 py-5">
                          <Badge className="bg-green-50 text-green-600 border-green-100 font-bold text-[10px] py-0.5">
                            Active
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : activeTab === "Clients & Campaigns" ? (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          <div className="grid grid-cols-2 gap-6">
            {/* Budget Distribution Pie */}
            <Card className="p-10 bg-white border border-gray-900 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-12 tracking-tight">
                Earnings by Client
              </h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={CLIENTS_PERFORMANCE_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="budget"
                      stroke="none"
                    >
                      {CLIENTS_PERFORMANCE_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        fontWeight: "bold",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      iconType="circle"
                      wrapperStyle={{ paddingLeft: "20px", fontWeight: "bold" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Campaign Performance Bar Chart */}
            <Card className="p-10 bg-white border border-gray-900 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-12 tracking-tight">
                Geographic Distribution
              </h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "North America", value: 42, color: "#f59e0b" }, // Amber
                      { name: "Europe", value: 18, color: "#6366f1" }, // Indigo
                      { name: "Asia-Pacific", value: 8, color: "#8b5cf6" }, // Violet
                      { name: "Global", value: 5, color: "#ec4899" }, // Rose
                    ]}
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fontWeight: "bold",
                        fill: "#64748b",
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 13,
                        fontWeight: "bold",
                        fill: "#64748b",
                      }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        fontWeight: "bold",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      }}
                      cursor={{ fill: "#f8fafc" }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                      {[
                        { name: "North America", value: 42, color: "#f59e0b" },
                        { name: "Europe", value: 18, color: "#6366f1" },
                        { name: "Asia-Pacific", value: 8, color: "#8b5cf6" },
                        { name: "Global", value: 5, color: "#ec4899" },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Client Performance List Table */}
          <Card className="bg-white border border-gray-900 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                Top Clients Performance
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-8 py-5 text-[11px] font-bold text-gray-500 tracking-widest">
                      Client
                    </th>
                    <th className="px-8 py-5 text-[11px] font-bold text-gray-500 tracking-widest text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {CLIENTS_PERFORMANCE_DATA.map((client) => (
                    <tr
                      key={client.name}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">
                            {client.name}
                          </span>
                          <span className="text-[10px] text-gray-500 font-bold">
                            {Math.floor(Math.random() * 5) + 3} campaigns
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-green-600">
                            ${client.budget.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">
                            {((client.budget / 45000) * 100).toFixed(1)}% of
                            total
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Summary Cards AT BOTTOM */}
          <div className="grid grid-cols-3 gap-6">
            <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden flex flex-col justify-center h-[180px]">
              <p className="text-sm font-bold text-gray-500 mb-2">
                Repeat Client Rate
              </p>
              <h3 className="text-4xl font-bold text-gray-900 tracking-tighter">
                78%
              </h3>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full bg-gray-900 rounded-full"
                  style={{ width: "78%" }}
                />
              </div>
            </Card>

            <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden flex flex-col justify-center h-[180px]">
              <p className="text-sm font-bold text-gray-500 mb-2">
                Avg Campaign Duration
              </p>
              <h3 className="text-4xl font-bold text-gray-900 tracking-tighter">
                18 days
              </h3>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                From booking to completion
              </p>
            </Card>

            <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden flex flex-col justify-center h-[180px]">
              <p className="text-sm font-bold text-gray-500 mb-2">
                Client Acquisition
              </p>
              <h3 className="text-4xl font-bold text-green-600 tracking-tighter">
                4
              </h3>
              <p className="text-xs text-green-600/70 mt-2 font-bold">
                New clients this quarter
              </p>
            </Card>
          </div>
        </div>
      ) : activeTab === "Compliance" ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Top Row: 3 Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-8 bg-white border border-gray-900 shadow-sm rounded-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Verification Rate
                  </p>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
                    100%
                  </h3>
                </div>
              </div>
              <div className="space-y-3">
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-900 rounded-full"
                    style={{ width: "100%" }}
                  />
                </div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  All talent verified
                </p>
              </div>
            </Card>

            <Card className="p-8 bg-white border border-gray-900 shadow-sm rounded-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Active Consents
                  </p>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
                    80%
                  </h3>
                </div>
              </div>
              <div className="space-y-3">
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-400 rounded-full"
                    style={{ width: "80%" }}
                  />
                </div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  8 of 10 complete
                </p>
              </div>
            </Card>

            <Card className="p-8 bg-white border border-gray-900 shadow-sm rounded-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Expiring Soon
                  </p>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
                    0
                  </h3>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                  Next 30 days
                </p>
              </div>
            </Card>
          </div>

          {/* Middle Row: License Expiry Pipeline */}
          <Card className="p-8 bg-white border border-gray-900 shadow-sm rounded-lg">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-6">
              License Expiry Pipeline
            </h3>
            <div className="bg-[#FFF7ED] border border-orange-100 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={TALENT_DATA.find((t) => t.id === "julia")?.img}
                  alt="Julia"
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div>
                  <p className="text-sm font-black text-gray-900">Julia</p>
                  <p className="text-xs font-bold text-gray-500">
                    License expires 2/15/2025
                  </p>
                </div>
              </div>
              <Button className="bg-[#EA580C] hover:bg-[#C2410C] text-white font-black text-xs px-8 h-10 rounded-lg uppercase tracking-widest gap-2">
                <RefreshCw className="w-4 h-4" /> Renew
              </Button>
            </div>
          </Card>

          {/* Bottom Row: Compliance Summary */}
          <Card className="p-8 bg-white border border-gray-900 shadow-sm rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Left Column: Consent Status Distribution */}
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest mb-10">
                  Compliance Summary
                </h3>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6 font-sans">
                  Consent Status Distribution
                </p>
                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                      <span className="text-gray-600">Complete</span>
                      <span className="text-green-600">8 (80%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 rounded-full"
                        style={{ width: "80%" }}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                      <span className="text-gray-600">Expiring</span>
                      <span className="text-orange-600">1 (10%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FB923C]/30 rounded-full shadow-inner"
                        style={{ width: "10%" }}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                      <span className="text-gray-600">Missing</span>
                      <span className="text-red-600">1 (10%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FECACA] rounded-full"
                        style={{ width: "10%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Likeness Protection */}
              <div className="space-y-10">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest font-sans">
                  Likeness Protection
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-6 bg-green-50/50 border border-green-100 rounded-xl">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                      Authorized Uses (30d)
                    </span>
                    <span className="text-3xl font-black text-green-600">
                      73
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-red-50/50 border border-red-100 rounded-xl">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                      Unauthorized Alerts
                    </span>
                    <span className="text-3xl font-black text-red-600">0</span>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                      Disputes Resolved
                    </span>
                    <span className="text-3xl font-black text-blue-600">2</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <PlaceholderView title={activeTab} />
      )}
    </div>
  );
};

const PlaceholderView = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-full py-20 text-center">
    <div className="bg-gray-100 p-6 rounded-full mb-4">
      <Settings className="w-10 h-10 text-gray-400" />
    </div>
    <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
    <p className="text-gray-500 max-w-sm">
      This section is currently under development. Check back soon for updates.
    </p>
  </div>
);

export default function AgencyDashboard() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile, authenticated, logout } = useAuth();

  // Initialize state from URL params
  const [agencyMode, setAgencyModeState] = useState<"AI" | "IRL">(
    (searchParams.get("mode") as "AI" | "IRL") || "AI",
  );
  const [activeTab, setActiveTabState] = useState(
    searchParams.get("tab") || "dashboard",
  );
  const [activeSubTab, setActiveSubTab] = useState(
    searchParams.get("subTab") || "All Talent",
  );

  const rosterQuery = useQuery({
    queryKey: ["agency-roster", user?.id],
    queryFn: async () => {
      const resp = await getAgencyRoster();
      return (resp as any) || null;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const dashboardOverviewQuery = useQuery({
    queryKey: ["agency-dashboard-overview", user?.id],
    queryFn: async () => {
      const resp = await getAgencyDashboardOverview();
      return resp as any;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });

  const talentPerformanceQuery = useQuery({
    queryKey: ["agency-dashboard-talent-performance", user?.id],
    queryFn: async () => {
      const resp = await getAgencyTalentPerformance();
      return resp as any;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });

  const revenueBreakdownQuery = useQuery({
    queryKey: ["agency-dashboard-revenue-breakdown", user?.id],
    queryFn: async () => {
      const resp = await getAgencyRevenueBreakdown();
      return resp as any;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const licensingPipelineQuery = useQuery({
    queryKey: ["agency-dashboard-licensing-pipeline", user?.id],
    queryFn: async () => {
      const resp = await getAgencyLicensingPipeline();
      return resp as any;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });

  const recentActivityQuery = useQuery({
    queryKey: ["agency-dashboard-recent-activity", user?.id],
    queryFn: async () => {
      const resp = await getAgencyRecentActivity();
      return resp as any;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });

  const agencyProfileQuery = useQuery({
    queryKey: ["agency-profile", user?.id],
    queryFn: async () => {
      const resp = await getAgencyProfile();
      return resp as any;
    },
    enabled: !!user?.id,
  });

  const licensingRequestsCountQuery = useQuery({
    queryKey: ["agency-licensing-requests", user?.id],
    queryFn: async () => {
      const resp = await getAgencyLicensingRequests();
      return resp as any;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });

  const pendingLicensingRequestsCount = useMemo(() => {
    const d: any = licensingRequestsCountQuery.data;
    const requests = d?.requests ?? d?.data ?? d;
    if (!Array.isArray(requests)) return 0;
    const pending = requests.filter((r: any) => r?.status === "pending");
    return pending.length;
  }, [licensingRequestsCountQuery.data]);

  const rosterTalents = useMemo(() => {
    const d: any = rosterQuery.data;
    const talents = d?.talents;
    if (Array.isArray(talents)) return talents;
    if (Array.isArray(d)) return d;
    return [];
  }, [rosterQuery.data]);

  const activeCampaigns = useMemo(() => {
    const d: any = rosterQuery.data;
    return Number(d?.active_campaigns ?? 0);
  }, [rosterQuery.data]);

  const earnings30dTotalCents = useMemo(() => {
    const d: any = rosterQuery.data;
    return Number(d?.earnings_30d_total_cents ?? 0);
  }, [rosterQuery.data]);

  const earningsPrev30dTotalCents = useMemo(() => {
    const d: any = rosterQuery.data;
    return Number(d?.earnings_prev_30d_total_cents ?? 0);
  }, [rosterQuery.data]);

  const agencyName =
    agencyProfileQuery.data?.agency_name ||
    profile?.agency_name ||
    "Agency Name";

  const agencyEmail =
    (agencyProfileQuery.data as any)?.email ||
    (profile as any)?.email ||
    user?.email ||
    "";

  const agencyWebsite =
    (agencyProfileQuery.data as any)?.website ||
    (profile as any)?.website ||
    "";

  const agencyLogoUrl =
    (agencyProfileQuery.data as any)?.logo_url ||
    (profile as any)?.logo_url ||
    "";

  const seatsLimit = useMemo(() => {
    return Number(
      agencyProfileQuery.data?.seats_limit ||
        (profile as any)?.seats_limit ||
        0,
    );
  }, [agencyProfileQuery.data, profile]);

  useEffect(() => {
    if (!user?.id) return;
    if (activeTab !== "roster") return;
    if (activeSubTab !== "All Talent") return;
    if (!rosterQuery.data) {
      rosterQuery.refetch();
    }
  }, [activeTab, activeSubTab, user?.id, rosterQuery.data, rosterQuery]);
  const [activeScoutingTab, setActiveScoutingTabState] = useState(
    searchParams.get("scoutingTab") || "Prospect Pipeline",
  );
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "roster",
    "licensing",
    "protection",
    "analytics",
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const [kycLoading, setKycLoading] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycSessionUrl, setKycSessionUrl] = useState<string | null>(null);
  const [kycEmbedLoading, setKycEmbedLoading] = useState(false);
  const [agencyKycStatus, setAgencyKycStatus] = useState<string | null>(null);
  const [kycStatusRefreshing, setKycStatusRefreshing] = useState(false);
  const veriffFrameRef = React.useRef<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookOuts, setBookOuts] = useState<any[]>([]);
  const [showCreatePackageWizard, setShowCreatePackageWizard] = useState(false);

  const goToEditProfile = () => {
    setActiveTab("settings");
    setActiveSubTab("General Settings");
    setSidebarOpen(false);
  };

  const goToMarketplace = () => {
    setActiveTab("scouting");
    setActiveScoutingTab("Marketplace");
    setSidebarOpen(false);
  };

  const refreshAgencyKycStatus = async () => {
    if (!authenticated || !user?.id) return;
    setKycStatusRefreshing(true);
    try {
      const rows: any = await base44.get("/kyc/status");
      const row = Array.isArray(rows) && rows.length ? rows[0] : null;
      const status = row?.kyc_status;
      if (typeof status === "string") setAgencyKycStatus(status);
    } catch {
      // ignore
    } finally {
      setKycStatusRefreshing(false);
    }
  };

  useEffect(() => {
    const s = (profile as any)?.kyc_status as string | undefined;
    if (typeof s === "string") setAgencyKycStatus(s);
  }, [profile]);

  // Sync verification status from backend on load
  useEffect(() => {
    refreshAgencyKycStatus();
  }, [authenticated, user?.id]);

  // Keep status fresh while pending (even if modal is closed)
  useEffect(() => {
    if (!authenticated || !user?.id) return;
    if (agencyKycStatus !== "pending") return;

    let active = true;
    const interval = window.setInterval(
      async () => {
        try {
          const rows: any = await base44.get("/kyc/status");
          const row = Array.isArray(rows) && rows.length ? rows[0] : null;
          const status = row?.kyc_status;
          if (!active || typeof status !== "string") return;
          setAgencyKycStatus(status);
        } catch {
          // ignore
        }
      },
      10 * 60 * 1000,
    );

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [agencyKycStatus, authenticated, user?.id]);

  useEffect(() => {
    if (!kycSessionUrl) return;

    const rootElementId = "veriff-kyc-embedded-agency";
    let cancelled = false;

    const loadIncontextScript = () => {
      const w = window as any;
      if (w.veriffSDK?.createVeriffFrame) return Promise.resolve();

      return new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(
          'script[data-likelee-veriff-incontext="1"]',
        ) as HTMLScriptElement | null;
        if (existing) {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(), { once: true });
          return;
        }

        const s = document.createElement("script");
        s.src = "https://cdn.veriff.me/incontext/js/v2.5.0/veriff.js";
        s.async = true;
        s.setAttribute("data-likelee-veriff-incontext", "1");
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load Veriff InContext"));
        document.body.appendChild(s);
      });
    };

    (async () => {
      try {
        setKycEmbedLoading(true);
        await loadIncontextScript();
        if (cancelled) return;

        const container = document.getElementById(rootElementId);
        if (container) container.innerHTML = "";

        const w = window as any;
        if (!w.veriffSDK?.createVeriffFrame) {
          throw new Error("Veriff SDK not available");
        }

        veriffFrameRef.current = w.veriffSDK.createVeriffFrame({
          url: kycSessionUrl,
          embedded: true,
          embeddedOptions: {
            rootElementID: rootElementId,
          },
          onEvent: (msg: any) => {
            if (msg === "SUBMITTED") {
              setAgencyKycStatus("pending");
              setShowKycModal(false);
              setKycSessionUrl(null);
            }
          },
        });

        setKycEmbedLoading(false);
      } catch (e: any) {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description:
            e?.message || "Failed to load verification. Please try again.",
          duration: 3000,
        });
        setKycEmbedLoading(false);
        setKycSessionUrl(null);
        setShowKycModal(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        veriffFrameRef.current?.close?.();
      } catch {
        // ignore
      }
      veriffFrameRef.current = null;
      const container = document.getElementById(rootElementId);
      if (container) container.innerHTML = "";
    };
  }, [kycSessionUrl, toast]);

  useEffect(() => {
    if (!showKycModal) return;
    if (!authenticated || !user?.id) return;

    let active = true;
    const interval = window.setInterval(async () => {
      try {
        const rows: any = await base44.get("/kyc/status");
        const row = Array.isArray(rows) && rows.length ? rows[0] : null;
        const status = row?.kyc_status;
        if (!active || !status) return;

        setAgencyKycStatus(status);

        if (status === "approved") {
          toast({
            title: "Verification Complete",
            description: "Your verification is approved.",
            duration: 3000,
          });
          setShowKycModal(false);
          setKycSessionUrl(null);
        } else if (status === "declined") {
          toast({
            variant: "destructive",
            title: "Verification Complete",
            description: "Your verification was declined.",
            duration: 3000,
          });
          setShowKycModal(false);
          setKycSessionUrl(null);
        }
      } catch {
        // ignore polling errors
      }
    }, 2500);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [authenticated, showKycModal, toast, user?.id]);

  // Load persisted bookings on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await listBookings();
        setBookings(Array.isArray(data) ? data : []);
      } catch (e) {
        // noop for now
      }
    })();
  }, []);

  // Load book-outs on mount
  useEffect(() => {
    (async () => {
      try {
        const rows = await listBookOuts();
        setBookOuts(Array.isArray(rows) ? rows : []);
      } catch (e) {
        // noop for now
      }
    })();
  }, []);

  const onAddBooking = async (booking: any) => {
    try {
      // If booking already has an id, it was created upstream (e.g., multipart with files).
      // Append directly to state to reflect immediately and avoid duplicate API call.
      if (booking && booking.id) {
        setBookings([...bookings, booking]);
        try {
          await notifyBookingCreatedEmail(booking.id);
          toast({ title: "Talent notified via email" });
        } catch (e) {
          const msg = (e as any)?.message || "Email notification failed";
          toast({ title: "Email notification", description: msg });
        }
        return;
      }
      const payload = {
        booking_type: booking.type || booking.bookingType,
        status: booking.status,
        client_id: booking.clientId || booking.client_id,
        talent_name: booking.talentName || booking.talent_name,
        client_name: booking.clientName || booking.client_name,
        date: booking.date,
        industries:
          booking.industries ||
          booking.industryTags ||
          booking.clientIndustries,
        notes: booking.notes,
      };
      const created = await apiCreateBooking(payload);
      const row = Array.isArray(created) ? created[0] : created;
      setBookings([...bookings, row]);
      try {
        if (row?.id) {
          await notifyBookingCreatedEmail(row.id);
          toast({ title: "Talent notified via email" });
        }
      } catch (e) {
        const msg = (e as any)?.message || "Email notification failed";
        toast({ title: "Email notification", description: msg });
      }
    } catch (e: any) {
      const msg =
        typeof e === "string" ? e : e?.message || "Failed to create booking";
      if (/409/.test(msg) || /unavailable/i.test(msg)) {
        toast({
          title: "Talent unavailable",
          description:
            "This talent is booked out during the selected date. Please choose another date or talent.",
          variant: "destructive" as any,
        });
        return;
      }
      toast({ title: "Create booking failed", description: msg });
    }
  };
  const onUpdateBooking = async (booking: any) => {
    try {
      const id = booking.id;
      const payload: any = {
        booking_type: booking.type || booking.bookingType,
        status: booking.status,
        date: booking.date,
        notes: booking.notes,
      };
      const updated = await apiUpdateBooking(id, payload);
      const row = Array.isArray(updated) ? updated[0] : updated;
      setBookings(bookings.map((b) => (b.id === row.id ? row : b)));
    } catch (e) {
      setBookings(bookings.map((b) => (b.id === booking.id ? booking : b)));
    }
  };
  const onCancelBooking = async (id: string) => {
    try {
      await apiCancelBooking(id);
      setBookings(bookings.filter((b) => b.id !== id));
    } catch (e) {
      setBookings(bookings.filter((b) => b.id !== id));
    }
  };
  const onAddBookOut = async (bookOut: any) => {
    try {
      const payload = {
        talent_id: bookOut.talentId || bookOut.talent_id,
        start_date: bookOut.startDate || bookOut.start_date,
        end_date: bookOut.endDate || bookOut.end_date,
        reason: bookOut.reason,
        notes: bookOut.notes,
      };
      const created = await createBookOut(payload);
      const row = Array.isArray(created) ? created[0] : created;
      setBookOuts([...bookOuts, row]);
    } catch (e) {
      // optimistic fallback
      setBookOuts([...bookOuts, bookOut]);
    }
  };
  const onRemoveBookOut = async (id: string) => {
    try {
      // Use fetch DELETE against API base
      const res = await fetch(api(`/book-outs/${id}`), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      setBookOuts(bookOuts.filter((b) => b.id !== id));
    } catch (e) {
      setBookOuts(bookOuts.filter((b) => b.id !== id));
    }
  };

  // Wrapper functions to update both state and URL params
  const setAgencyMode = (mode: "AI" | "IRL") => {
    setAgencyModeState(mode);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("mode", mode);
      return newParams;
    });
  };

  useEffect(() => {
    if (agencyMode !== "AI") return;
    if (activeTab !== "accounting") return;
    setActiveTab("dashboard");
  }, [agencyMode, activeTab]);

  useEffect(() => {
    const handleSwitchTab = (e: any) => {
      const { tab, subTab, scoutingTab } = e.detail;
      if (tab) setActiveTab(tab);
      if (subTab) setActiveSubTab(subTab);
      if (scoutingTab) setActiveScoutingTab(scoutingTab);
    };

    window.addEventListener("switchTab", handleSwitchTab);
    return () => window.removeEventListener("switchTab", handleSwitchTab);
  }, []);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("tab", tab);
      return newParams;
    });
  };

  const setActiveScoutingTab = (tab: string) => {
    setActiveScoutingTabState(tab);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("scoutingTab", tab);
      return newParams;
    });
  };

  // Helper for API URLs
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || "";
  const API_BASE_ABS = (() => {
    try {
      if (!API_BASE) return new URL("/", window.location.origin).toString();
      if (API_BASE.startsWith("http")) return API_BASE;
      return new URL(API_BASE, window.location.origin).toString();
    } catch {
      return new URL("/", window.location.origin).toString();
    }
  })();
  const api = (path: string) => new URL(path, API_BASE_ABS).toString();

  const handleKYC = async () => {
    if (!authenticated || !user?.id) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to start verification.",
        duration: 3000,
      });
      return;
    }

    if (agencyKycStatus === "pending") {
      toast({
        title: "Verification In Progress",
        description: "Your KYC verification is already pending.",
      });
      return;
    }
    if (agencyKycStatus === "approved") {
      toast({
        title: "Already Verified",
        description: "Your KYC verification is already approved.",
      });
      return;
    }

    try {
      setShowKycModal(true);
      setKycEmbedLoading(true);
      setAgencyKycStatus("pending");
      setKycLoading(true);
      toast({
        title: "Verification Initiated",
        description: "Starting Veriff identity verification process...",
        duration: 3000,
      });

      const data: any = await base44.post("/kyc/session", {
        user_id: user.id,
      });

      if (data.session_url) {
        setAgencyKycStatus("pending");
        setKycSessionUrl(String(data.session_url));
      } else {
        throw new Error("No session URL returned");
      }
    } catch (e: any) {
      console.error("KYC Error:", e);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: `Failed to start verification: ${e?.message || "Unknown error"}`,
        duration: 3000,
      });
      setShowKycModal(false);
      setKycSessionUrl(null);
      setAgencyKycStatus((profile as any)?.kyc_status || null);
    } finally {
      setKycLoading(false);
    }
  };

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const [headerSearchValue, setHeaderSearchValue] = useState("");
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSending, setSupportSending] = useState(false);

  useEffect(() => {
    if (!showNotifications && !showProfileMenu) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-header-dropdown]")) return;
      setShowNotifications(false);
      setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showNotifications, showProfileMenu]);

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  useEffect(() => {
    if (activeTab !== "accounting") return;
    const validAccountingSubTabs = new Set([
      "Connect Bank",
      "Invoice Generation",
      "Invoice Management",
      "Payment Tracking",
      "Talent Statements",
      "Financial Reports",
      "Expense Tracking",
    ]);
    if (!validAccountingSubTabs.has(activeSubTab)) {
      setActiveSubTab("Connect Bank");
    }
  }, [activeSubTab, activeTab]);

  // Sidebar Items
  interface SidebarItem {
    id: string;
    label: string;
    icon: React.ElementType;
    subItems?: string[];
    badges?: Record<string, string | number>;
  }

  const sidebarItems: SidebarItem[] =
    agencyMode === "AI"
      ? [
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          {
            id: "roster",
            label: "Roster",
            icon: Users,
            subItems: ["All Talent", "Performance Tiers"],
          },
          {
            id: "licensing",
            label: "Licensing",
            icon: FileText,
            subItems: [
              "Licensing Requests",
              "License Submissions",
              "Active Licenses",
              "License Templates",
            ],
          },
          {
            id: "protection",
            label: "Protection & Usage",
            icon: Shield,
            subItems: ["Protect & Usage", "Compliance Hub"],
            badges: { "Compliance Hub": "NEW" },
          },
          {
            id: "analytics",
            label: "Analytics",
            icon: BarChart2,
            subItems: ["Analytics Dashboard", "Royalties & Payouts"],
          },
          { id: "packages", label: "Talent Packages", icon: Package },
          {
            id: "settings",
            label: "Settings",
            icon: Settings,
            subItems: ["General Settings", "File Storage"],
          },
        ]
      : [
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          {
            id: "roster",
            label: "Roster",
            icon: Users,
            subItems: ["All Talent", "Performance Tiers"],
          },
          { id: "scouting", label: "Scouting", icon: Target },
          { id: "client-crm", label: "Client CRM", icon: Building2 },
          {
            id: "bookings",
            label: "Bookings",
            icon: Calendar,
            subItems: [
              "Calendar & Schedule",
              "Booking Requests",
              "Client Database",
              "Talent Availability",
              "Notifications",
              "Management & Analytics",
            ],
          },
          {
            id: "accounting",
            label: "Accounting & Invoicing",
            icon: CreditCard,
            subItems: [
              "Invoice Generation",
              "Invoice Management",
              "Payment Tracking",
              "Talent Statements",
              "Financial Reports",
              "Expense Tracking",
              "Connect Bank",
            ],
          },
          {
            id: "analytics",
            label: "Analytics",
            icon: BarChart2,
            subItems: ["Analytics Dashboard", "Royalties & Payouts"],
          },
          { id: "packages", label: "Talent Packages", icon: Package },
          {
            id: "settings",
            label: "Settings",
            icon: Settings,
            subItems: ["General Settings", "File Storage"],
          },
        ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-slate-800">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 bg-white border-r border-gray-200 flex flex-col fixed top-16 left-0 h-[calc(100vh-4rem)] z-40 transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div
          className="p-6 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => {
            setActiveTab("settings");
            setActiveSubTab("General Settings");
            setSidebarOpen(false);
          }}
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-2 border-gray-200 p-1 shadow-sm overflow-hidden">
              {profile?.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={profile.agency_name || "Agency"}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-indigo-50 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-indigo-600" />
                </div>
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="font-bold text-gray-900 text-base leading-tight truncate">
                {profile?.agency_name || "Agency Name"}
              </h2>
              {agencyKycStatus === "approved" && (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0.5 text-[10px] font-bold gap-1 shrink-0">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 font-medium truncate">
              {profile?.email || user?.email}
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-1 py-4">
          {sidebarItems.map((item) => (
            <div key={item.id} className="mb-2">
              <button
                onClick={() => {
                  if (item.subItems) {
                    toggleExpanded(item.id);
                    if (item.id === "settings") {
                      setActiveTab("settings");
                      setActiveSubTab("General Settings");
                    }
                  } else {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id && !item.subItems
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 ${
                    activeTab === item.id ? "text-indigo-700" : "text-gray-500"
                  }`}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {item.subItems && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedItems.includes(item.id) ? "text-gray-600 rotate-180" : "text-gray-400"}`}
                  />
                )}
              </button>

              {/* Sub-items */}
              {item.subItems && expandedItems.includes(item.id) && (
                <div className="mt-1 ml-9 space-y-1 animate-in slide-in-from-top-2 duration-200">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem}
                      onClick={() => {
                        setActiveTab(item.id);
                        setActiveSubTab(subItem);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        activeTab === item.id && activeSubTab === subItem
                          ? "text-indigo-700 bg-indigo-50 font-bold"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-medium"
                      }`}
                    >
                      <span className="truncate">{subItem}</span>
                      {item.badges && item.badges[subItem] && (
                        <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                          {item.badges[subItem]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors w-full px-3 py-2 rounded-lg hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-0 md:ml-64 overflow-hidden transition-all duration-300">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-gray-500 hover:text-gray-900"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-6 h-6" />
          </Button>

          <div className="flex items-center gap-4 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAgencyMode(agencyMode === "AI" ? "IRL" : "AI")}
              className="font-bold border-2 border-gray-200 hover:bg-gray-50 transition-all"
            >
              {agencyMode === "AI" ? "AI Mode" : "IRL Mode"}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-gray-900"
              onClick={() => setShowHeaderSearch(true)}
            >
              <Search className="w-5 h-5" />
            </Button>

            {/* Notifications Dropdown */}
            <div className="relative" data-header-dropdown>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-900 relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5" />
              </Button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Notifications</h3>
                  </div>
                  <div className="p-6">
                    <p className="text-sm font-bold text-gray-900">
                      No notifications yet
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      When your agency receives updates, they’ll show up here.
                    </p>
                  </div>
                  <div className="p-4 border-t border-gray-100 text-center">
                    <button
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                      onClick={() => {
                        setShowNotifications(false);
                        setShowSupportDialog(true);
                      }}
                    >
                      Contact support
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-gray-900"
              onClick={() => {
                setShowSupportDialog(true);
              }}
            >
              <HelpCircle className="w-5 h-5" />
            </Button>

            {/* Profile Dropdown */}
            <div className="relative" data-header-dropdown>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-900"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <User className="w-5 h-5" />
              </Button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center p-1 overflow-hidden">
                        {profile?.logo_url ? (
                          <img
                            src={profile.logo_url}
                            alt={profile.agency_name || "Agency"}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full bg-indigo-50 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">
                          {profile?.agency_name || "Agency Name"}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          Agency Account
                        </p>
                      </div>
                    </div>
                    {agencyKycStatus === "approved" && (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0.5 text-xs font-bold gap-1">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </Badge>
                    )}
                  </div>

                  <div className="p-2">
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors text-left group"
                      onClick={() => {
                        setShowProfileMenu(false);
                        goToEditProfile();
                      }}
                    >
                      <Building2 className="w-4 h-4 text-gray-500 group-hover:text-gray-900" />
                      <div>
                        <p className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
                          Organization Settings
                        </p>
                        <p className="text-xs text-gray-500">
                          Manage company profile
                        </p>
                      </div>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors text-left group"
                      onClick={() => {
                        toast({
                          title: "Team & Permissions",
                          description: "Coming soon",
                          duration: 2000,
                        });
                        setShowProfileMenu(false);
                      }}
                    >
                      <Users className="w-4 h-4 text-gray-500 group-hover:text-gray-900" />
                      <div>
                        <p className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
                          Team & Permissions
                        </p>
                        <p className="text-xs text-gray-500">10 active users</p>
                      </div>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors text-left group"
                      onClick={() => {
                        toast({
                          title: "Billing & Subscription",
                          description: "Coming soon",
                          duration: 2000,
                        });
                        setShowProfileMenu(false);
                      }}
                    >
                      <CreditCard className="w-4 h-4 text-gray-500 group-hover:text-gray-900" />
                      <div>
                        <p className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
                          Billing & Subscription
                        </p>
                        <p className="text-xs text-gray-500">Agency Pro Plan</p>
                      </div>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors text-left group"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setActiveTab("protection");
                        setActiveSubTab("Compliance Hub");
                        setSidebarOpen(false);
                      }}
                    >
                      <FileText className="w-4 h-4 text-gray-500 group-hover:text-gray-900" />
                      <div>
                        <p className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
                          Legal & Compliance
                        </p>
                        <p className="text-xs text-gray-500">
                          Contracts, terms, privacy
                        </p>
                      </div>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors text-left group"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setActiveTab("settings");
                        setActiveSubTab("General Settings");
                        setSidebarOpen(false);
                      }}
                    >
                      <LinkIcon className="w-4 h-4 text-gray-500 group-hover:text-gray-900" />
                      <div>
                        <p className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
                          Integrations
                        </p>
                        <p className="text-xs text-gray-500">
                          Stripe, ElevenLabs connected
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="p-2 border-t border-gray-100">
                    <button
                      onClick={() => logout()}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 rounded-lg transition-colors text-left text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-bold">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <Dialog open={showHeaderSearch} onOpenChange={setShowHeaderSearch}>
          <DialogContent className="sm:max-w-[520px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Search
              </DialogTitle>
              <DialogDescription className="text-gray-500 font-medium">
                Search your roster by name.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                autoFocus
                value={headerSearchValue}
                onChange={(e) => setHeaderSearchValue(e.target.value)}
                placeholder="Search talent..."
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowHeaderSearch(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const q = headerSearchValue.trim();
                    setShowHeaderSearch(false);
                    if (!q) return;
                    setActiveTab("roster");
                    setActiveSubTab("All Talent");
                    setSearchTerm(q);
                    setSidebarOpen(false);
                  }}
                >
                  Search
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
          <DialogContent className="sm:max-w-[560px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Contact Likelee Support
              </DialogTitle>
              <DialogDescription className="text-gray-500 font-medium">
                Send a message to our support team.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  placeholder="e.g. Issue with KYC status"
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="Describe your issue..."
                  className="min-h-[140px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowSupportDialog(false)}
                disabled={supportSending}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const subject = supportSubject.trim();
                  const message = supportMessage.trim();
                  if (!subject || !message) {
                    toast({
                      title: "Missing details",
                      description: "Please add a subject and message.",
                      variant: "destructive" as any,
                    });
                    return;
                  }

                  setSupportSending(true);
                  try {
                    const fromEmail =
                      (profile as any)?.email || user?.email || "unknown";
                    const agencyId =
                      (profile as any)?.id || user?.id || "unknown";
                    const body = `From: ${fromEmail}\nAgency/User ID: ${agencyId}\n\n${message}`;

                    await sendEmail({
                      to: "support@likelee.ai",
                      subject,
                      body,
                    });

                    toast({
                      title: "Message sent",
                      description: "Support will get back to you shortly.",
                    });
                    setShowSupportDialog(false);
                    setSupportSubject("");
                    setSupportMessage("");
                  } catch (e: any) {
                    toast({
                      title: "Failed to send",
                      description:
                        e?.message || "Could not send your message to support.",
                      variant: "destructive" as any,
                    });
                  } finally {
                    setSupportSending(false);
                  }
                }}
                disabled={supportSending}
              >
                {supportSending ? "Sending..." : "Send"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dynamic Dashboard Content */}
        <main className="flex-1 overflow-auto px-12 py-8 bg-gray-50">
          {activeTab === "dashboard" && (
            <AgencyDashboardView
              onKYC={handleKYC}
              agencyName={agencyName}
              rosterData={rosterTalents}
              licensingRequestsCount={pendingLicensingRequestsCount}
              overview={dashboardOverviewQuery.data}
              talentPerformance={talentPerformanceQuery.data}
              revenueBreakdown={revenueBreakdownQuery.data}
              licensingPipeline={licensingPipelineQuery.data}
              recentActivity={recentActivityQuery.data}
              kycStatus={agencyKycStatus}
              kycLoading={kycLoading}
              onRefreshStatus={refreshAgencyKycStatus}
              refreshLoading={kycStatusRefreshing}
            />
          )}
          {activeTab === "roster" && activeSubTab === "All Talent" && (
            <AgencyRosterView
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              sortConfig={sortConfig}
              setSortConfig={setSortConfig}
              agencyMode={agencyMode}
              rosterData={rosterTalents}
              activeCampaigns={activeCampaigns}
              earnings30dTotalCents={earnings30dTotalCents}
              earningsPrev30dTotalCents={earningsPrev30dTotalCents}
              agencyName={agencyName}
              agencyEmail={agencyEmail}
              agencyWebsite={agencyWebsite}
              logoUrl={agencyLogoUrl}
              kycStatus={agencyKycStatus}
              onEditProfile={goToEditProfile}
              onViewMarketplace={goToMarketplace}
              seatsLimit={seatsLimit}
              isLoading={rosterQuery.isLoading}
              onRosterChanged={() => rosterQuery.refetch()}
            />
          )}
          {activeTab === "roster" && activeSubTab === "Performance Tiers" && (
            <PerformanceTiers />
          )}
          {activeTab === "licensing" &&
            activeSubTab === "Licensing Requests" && <LicensingRequestsTab />}
          {activeTab === "licensing" &&
            activeSubTab === "License Submissions" && <LicenseSubmissionsTab />}
          {activeTab === "licensing" && activeSubTab === "Active Licenses" && (
            <ActiveLicensesView />
          )}
          {activeTab === "licensing" &&
            activeSubTab === "License Templates" && <LicenseTemplatesTab />}
          {activeTab === "protection" && activeSubTab === "Protect & Usage" && (
            <ProtectionUsageView />
          )}
          {activeTab === "protection" && activeSubTab === "Compliance Hub" && (
            <ComplianceHubView />
          )}
          {activeTab === "analytics" &&
            activeSubTab === "Analytics Dashboard" && (
              <AnalyticsDashboardView />
            )}
          {activeTab === "analytics" &&
            activeSubTab === "Royalties & Payouts" && <RoyaltiesPayoutsView />}
          {activeTab === "packages" && <PackagesView />}
          {activeTab === "settings" && activeSubTab === "General Settings" && (
            <GeneralSettingsView />
          )}
          {activeTab === "settings" && activeSubTab === "File Storage" && (
            <FileStorageView />
          )}
          {activeTab === "scouting" && (
            <ScoutingHubView
              activeTab={activeScoutingTab}
              setActiveTab={setActiveScoutingTab}
            />
          )}
          {activeTab === "client-crm" && <ClientCRMView />}
          {activeTab === "file-storage" && <FileStorageView />}
          {activeTab === "bookings" && (
            <BookingsView
              activeSubTab={activeSubTab}
              bookings={bookings}
              onAddBooking={onAddBooking}
              onUpdateBooking={onUpdateBooking}
              onCancelBooking={onCancelBooking}
              bookOuts={bookOuts}
              onAddBookOut={onAddBookOut}
              onRemoveBookOut={onRemoveBookOut}
            />
          )}
          {activeTab === "accounting" && (
            <div>
              {activeSubTab === "Connect Bank" && <ConnectBankView />}
              {activeSubTab === "Invoice Generation" && <GenerateInvoiceView />}
              {activeSubTab === "Invoice Management" && (
                <InvoiceManagementView
                  setActiveSubTab={setActiveSubTab}
                  activeSubTab={activeSubTab}
                />
              )}
              {activeSubTab === "Payment Tracking" && <PaymentTrackingView />}
              {activeSubTab === "Talent Statements" && <TalentStatementsView />}
              {activeSubTab === "Financial Reports" && <FinancialReportsView />}
              {activeSubTab === "Expense Tracking" && <ExpenseTrackingView />}
            </div>
          )}
        </main>

        <Dialog
          open={showKycModal}
          onOpenChange={(open) => {
            setShowKycModal(open);
            if (!open) {
              setKycSessionUrl(null);
              setKycEmbedLoading(false);
            }
          }}
        >
          <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>KYC Verification</DialogTitle>
              <DialogDescription>
                Complete identity verification securely in this modal.
              </DialogDescription>
            </DialogHeader>
            <div className="w-full h-full bg-white">
              {(kycEmbedLoading || !kycSessionUrl) && (
                <div className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  <p className="text-sm text-gray-700">
                    Starting verification…
                  </p>
                </div>
              )}
              <div id="veriff-kyc-embedded-agency" className="w-full h-full" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
