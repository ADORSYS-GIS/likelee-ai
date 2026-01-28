import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw } from "lucide-react";
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
  Search,
  Shield,
  History,
  Trash2,
  XCircle,
  Eye,
  EyeOff,
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
                <SelectItem value="admin">
                  Admin - Full access, billing, settings
                </SelectItem>
                <SelectItem value="booker">
                  Booker - Create/edit bookings, view earnings
                </SelectItem>
                <SelectItem value="scout">
                  Scout - Add prospects, view scouting pipeline
                </SelectItem>
                <SelectItem value="accountant">
                  Accountant - View/create invoices, reports
                </SelectItem>
                <SelectItem value="coordinator">
                  Talent Coordinator - Manage talent profiles
                </SelectItem>
                <SelectItem value="readonly">
                  Read-Only - View everything
                </SelectItem>
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
                    <Switch checked={perm.default} />
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
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("Profile");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [primaryColor, setPrimaryColor] = useState(profile?.primary_color || "#4F46E5");
  const [secondaryColor, setSecondaryColor] = useState(profile?.secondary_color || "#10B981");
  const primaryColorInputRef = useRef<HTMLInputElement>(null);
  const secondaryColorInputRef = useRef<HTMLInputElement>(null);
  const [prodKey, setProdKey] = useState("pk_live_51P2x8S2e3f4g5h6i7j8k9l0m");
  const [testKey, setTestKey] = useState("pk_test_51P2x8S2e3f4g5h6i7j8k9l0m");
  const [showProdKey, setShowProdKey] = useState(false);
  const [showTestKey, setShowTestKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    agency_name: "",
    legal_entity_name: "",
    address: "",
    city: "",
    state: "",
    zip_postal_code: "",
    country: "us",
    time_zone: "est",
    phone_number: "",
    email: "",
    website: "",
    tax_id_ein: "",
    email_signature: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        agency_name: profile.agency_name || "",
        legal_entity_name: profile.legal_entity_name || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zip_postal_code: profile.zip_postal_code || "",
        country: profile.country || "us",
        time_zone: profile.time_zone || "est",
        phone_number: profile.phone_number || "",
        email: profile.email || "",
        website: profile.website || "",
        tax_id_ein: profile.tax_id_ein || "",
        email_signature: profile.email_signature || "",
      });
      setPrimaryColor(profile.primary_color || "#4F46E5");
      setSecondaryColor(profile.secondary_color || "#10B981");
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("agencies")
        .update({
          ...formData,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile?.id);

      if (error) throw error;

      await refreshProfile();
      toast({
        title: "Settings Saved",
        description: "Your agency profile has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `agency-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("likelee-public")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("likelee-public")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("agencies")
        .update({ logo_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({
        title: "Logo Updated",
        description: "Your agency logo has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-full mx-auto">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Agency Settings
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-medium">
            Configure your agency profile and preferences
          </p>
        </div>

        <div className="flex gap-2 p-1 bg-gray-100/50 rounded-xl w-full overflow-x-auto no-scrollbar lg:w-fit">
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
            {/* Agency Information */}
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  Agency Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Agency Name *
                  </Label>
                  <Input
                    value={formData.agency_name}
                    onChange={(e) => handleInputChange("agency_name", e.target.value)}
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Legal Entity Name
                  </Label>
                  <Input
                    value={formData.legal_entity_name}
                    onChange={(e) => handleInputChange("legal_entity_name", e.target.value)}
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Address
                  </Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    City
                  </Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-900">
                      State/Province
                    </Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => handleInputChange("state", e.target.value)}
                      className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-900">
                      ZIP/Postal Code
                    </Label>
                    <Input
                      value={formData.zip_postal_code}
                      onChange={(e) => handleInputChange("zip_postal_code", e.target.value)}
                      className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Country
                  </Label>
                  <Select
                    value={formData.country}
                    onValueChange={(val) => handleInputChange("country", val)}
                  >
                    <SelectTrigger className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="ca">Canada</SelectItem>
                      <SelectItem value="de">Germany</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Time Zone
                  </Label>
                  <Select
                    value={formData.time_zone}
                    onValueChange={(val) => handleInputChange("time_zone", val)}
                  >
                    <SelectTrigger className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="est">Eastern Time (EST)</SelectItem>
                      <SelectItem value="cst">Central Time (CST)</SelectItem>
                      <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Phone
                  </Label>
                  <Input
                    value={formData.phone_number}
                    onChange={(e) => handleInputChange("phone_number", e.target.value)}
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Email
                  </Label>
                  <Input
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Website
                  </Label>
                  <Input
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Tax ID / EIN
                  </Label>
                  <Input
                    value={formData.tax_id_ein}
                    onChange={(e) => handleInputChange("tax_id_ein", e.target.value)}
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
              </div>
            </Card>

            {/* Branding */}
            {/* Branding */}
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
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
                      {profile?.logo_url ? (
                        <img
                          src={profile.logo_url}
                          alt="Logo"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full bg-indigo-50 flex items-center justify-center">
                          <Building2 className="w-8 h-8 text-indigo-600" />
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      className="hidden"
                      accept="image/*"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="h-10 px-4 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                    >
                      {isUploading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {isUploading ? "Uploading..." : "Upload New Logo"}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:gap-8">
                  <div className="space-y-3 sm:space-y-4">
                    <Label className="text-xs sm:text-sm font-bold text-gray-900">
                      Primary Brand Color
                    </Label>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-gray-200 shadow-sm shrink-0 overflow-hidden">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="absolute inset-0 w-full h-full cursor-pointer"
                          style={{
                            opacity: 0,
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                          }}
                        />
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ backgroundColor: primaryColor }}
                        />
                      </div>
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="bg-white border-gray-200 h-9 sm:h-11 text-gray-500 font-medium rounded-xl flex-1 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <Label className="text-xs sm:text-sm font-bold text-gray-900">
                      Secondary Brand Color
                    </Label>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-gray-200 shadow-sm shrink-0 overflow-hidden">
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="absolute inset-0 w-full h-full cursor-pointer"
                          style={{
                            opacity: 0,
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                          }}
                        />
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ backgroundColor: secondaryColor }}
                        />
                      </div>
                      <Input
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="bg-white border-gray-200 h-9 sm:h-11 text-gray-500 font-medium rounded-xl flex-1 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Email Signature
                  </Label>
                  <Textarea
                    value={formData.email_signature}
                    onChange={(e) => handleInputChange("email_signature", e.target.value)}
                    placeholder={`Best regards,\nAgency Name\nhttps://agency.com/\n+1 (212) 555-0123`}
                    className="bg-white border-gray-200 min-h-[120px] text-xs sm:text-sm text-gray-900 font-medium rounded-xl resize-none"
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSaving ? "Saving..." : "Save Profile Settings"}
              </Button>
            </div>
          </div>
        )}

        {activeTab === "Commissions" && (
          <div className="space-y-6">
            {/* Default Commission Rate */}
            {/* Default Commission Rate */}
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  Default Commission Rate
                </h3>
              </div>
              <div className="space-y-4">
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
            {/* Division Commissions */}
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
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
                    className="flex items-center justify-between gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {division.name}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        {division.count} talent
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Input
                          defaultValue={division.rate}
                          className="w-10 h-7 sm:w-12 sm:h-8 bg-white border-gray-200 text-center font-bold text-xs rounded-lg"
                        />
                        <span className="text-xs font-bold text-gray-500">
                          %
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-gray-400 hover:text-indigo-600"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Per-Talent Custom Commissions */}
            {/* Per-Talent Custom Commissions */}
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
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
              <Button className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                <Save className="w-5 h-5" />
                Save Commission Settings
              </Button>
            </div>
          </div>
        )}

        {activeTab === "Email Templates" && (
          <div className="space-y-6">
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
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
                <Button className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-2">
                  <Plus className="w-3 h-3" />
                  New Template
                </Button>
              </div>

              <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl mb-8">
                <h4 className="text-sm font-bold text-blue-900 mb-4">
                  Available Variables:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-y-3 gap-x-8">
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
                    className="p-4 sm:p-6 bg-gray-50/50 border border-gray-100 rounded-2xl space-y-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <h4 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                          {template.title}
                        </h4>
                        <Badge className="bg-green-50 text-green-600 border-green-100 font-bold text-[10px] h-5 shrink-0">
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-7 h-7 rounded-lg border-gray-200"
                        >
                          <Edit2 className="w-3 h-3 text-gray-500" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-7 h-7 rounded-lg border-gray-200"
                        >
                          <Copy className="w-3 h-3 text-gray-500" />
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
                      <div className="p-6 bg-gray-100 border border-gray-200 rounded-xl text-base text-gray-700 font-medium whitespace-pre-line leading-relaxed min-h-[150px]">
                        {template.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex justify-end">
              <Button className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                <Save className="w-5 h-5" />
                Save Email Templates
              </Button>
            </div>
          </div>
        )}

        {activeTab === "Notifications" && (
          <div className="space-y-6">
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-gray-600" />
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
                    email: true,
                    sms: false,
                    push: true,
                  },
                  {
                    title: "Booking Confirmed",
                    desc: "When a booking status changes to confirmed",
                    email: true,
                    sms: true,
                    push: true,
                  },
                  {
                    title: "Payment Received",
                    desc: "When payment is received from a client",
                    email: true,
                    sms: false,
                    push: true,
                  },
                  {
                    title: "Invoice Sent",
                    desc: "When an invoice is sent to a client",
                    email: true,
                    sms: false,
                    push: false,
                  },
                  {
                    title: "Talent Book Out",
                    desc: "When talent marks themselves unavailable",
                    email: true,
                    sms: true,
                    push: true,
                  },
                  {
                    title: "License Expiring",
                    desc: "When a talent license is about to expire",
                    email: true,
                    sms: false,
                    push: true,
                  },
                ].map((pref) => (
                  <div
                    key={pref.title}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-xl"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">
                        {pref.title}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        {pref.desc}
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch checked={pref.email} />
                        <span className="text-xs font-bold text-gray-900">
                          Email
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={pref.sms} />
                        <span className="text-xs font-bold text-gray-900">
                          SMS
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={pref.push} />
                        <span className="text-xs font-bold text-gray-900">
                          Push
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">
                Notification Recipients
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Primary Notification Email
                  </Label>
                  <Input
                    defaultValue="bookings@cmmodels.com"
                    className="bg-white border-gray-200 h-11 text-gray-500 font-medium rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    SMS Notification Number
                  </Label>
                  <Input
                    defaultValue="+1 (212) 555-0123"
                    className="bg-white border-gray-200 h-11 text-gray-500 font-medium rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Additional Recipients (comma-separated)
                  </Label>
                  <Input
                    defaultValue="agent1@cmmodels.com, agent2@cmmodels.com"
                    className="bg-white border-gray-200 h-11 text-gray-500 font-medium rounded-xl"
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                <Save className="w-5 h-5" />
                Save Notification Settings
              </Button>
            </div>
          </div>
        )}

        {activeTab === "Tax & Currency" && (
          <div className="space-y-6">
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-gray-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  Currency Settings
                </h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Default Currency
                  </Label>
                  <Select defaultValue="usd">
                    <SelectTrigger className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="usd">USD - US Dollar</SelectItem>
                      <SelectItem value="eur">EUR - Euro</SelectItem>
                      <SelectItem value="gbp">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Currency Display Format
                  </Label>
                  <Select defaultValue="1234.56">
                    <SelectTrigger className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="1234.56">$1,234.56</SelectItem>
                      <SelectItem value="1234,56">$1.234,56</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">
                Tax Rates
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Default Tax Rate (%)
                  </Label>
                  <Input
                    defaultValue="8.875"
                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                  />
                  <p className="text-xs text-gray-500 font-medium">
                    Applied to invoices (e.g., sales tax, VAT)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Tax Display Name
                  </Label>
                  <Input
                    defaultValue="Sales Tax"
                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Switch checked={true} />
                    <span className="text-sm font-bold text-gray-900">
                      Include tax in displayed prices
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">
                Payment Terms
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Default Payment Terms
                  </Label>
                  <Select defaultValue="net30">
                    <SelectTrigger className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl">
                      <SelectValue placeholder="Select terms" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="due">Due on Receipt</SelectItem>
                      <SelectItem value="net15">Net 15</SelectItem>
                      <SelectItem value="net30">Net 30</SelectItem>
                      <SelectItem value="net60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Late Payment Fee (%)
                  </Label>
                  <Input
                    defaultValue="1.5"
                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                  />
                  <p className="text-xs text-gray-500 font-medium">
                    Monthly interest on overdue invoices
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Invoice Prefix
                  </Label>
                  <Input
                    defaultValue="INV-"
                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                  />
                  <p className="text-xs text-gray-500 font-medium">
                    Example: INV-00001, INV-00002
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                <Save className="w-5 h-5" />
                Save Tax & Currency Settings
              </Button>
            </div>
          </div>
        )}

        {activeTab === "Divisions" && (
          <div className="space-y-6">
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                      Divisions / Boards
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      Organize your talent into divisions
                    </p>
                  </div>
                </div>
                <Button className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Division
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[
                  { name: "Women", count: 45, rate: 20 },
                  { name: "Men", count: 32, rate: 20 },
                  { name: "Kids", count: 18, rate: 15 },
                  { name: "Curve", count: 12, rate: 20 },
                ].map((division) => (
                  <div
                    key={division.name}
                    className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-gray-900">
                        {division.name}
                      </h4>
                      <Badge className="bg-green-50 text-green-600 border-green-100 font-bold text-[10px] h-5">
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                      {division.count} talent assigned
                    </p>
                    <div className="flex items-end justify-between pt-2">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Commission Rate
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {division.rate}%
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-9 h-9 rounded-xl border-gray-200"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-9 h-9 rounded-xl border-red-100 bg-red-50 hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">
                Bulk Assignment
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Select Talent
                  </Label>
                  <Select>
                    <SelectTrigger className="bg-white border-gray-200 h-11 text-gray-500 font-medium rounded-xl">
                      <SelectValue placeholder="Choose talent to assign..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="t1">Talent 1</SelectItem>
                      <SelectItem value="t2">Talent 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Assign to Division
                  </Label>
                  <Select>
                    <SelectTrigger className="bg-white border-gray-200 h-11 text-gray-500 font-medium rounded-xl">
                      <SelectValue placeholder="Choose division..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="women">Women</SelectItem>
                      <SelectItem value="men">Men</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  className="font-bold rounded-xl h-10 px-6 border-gray-200"
                >
                  Assign Talent
                </Button>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                <Save className="w-5 h-5" />
                Save Division Settings
              </Button>
            </div>
          </div>
        )}

        {activeTab === "Team" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Team Management
                </h3>
                <p className="text-sm text-gray-500 font-medium hidden sm:block">
                  Manage team members, roles, and permissions
                </p>
              </div>
              <Button
                onClick={() => setShowInviteModal(true)}
                className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Invite User
              </Button>
            </div>

            <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-gray-900">Team Seats</span>
                </div>
                <span className="text-sm font-bold text-gray-600">
                  6 of 10 seats used
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: "60%" }}
                />
              </div>
              <p className="text-xs text-gray-500 font-medium mt-3">
                4 seats remaining • Professional Plan
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-base font-bold text-gray-900 uppercase tracking-wider">
                User Roles
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[
                  {
                    role: "Admin",
                    desc: "Full access, billing, settings",
                    color: "bg-purple-50 text-purple-700 border-purple-100",
                  },
                  {
                    role: "Booker",
                    desc: "Create/edit bookings, view earnings",
                    color: "bg-blue-50 text-blue-700 border-blue-100",
                  },
                  {
                    role: "Scout",
                    desc: "Add prospects, view scouting pipeline",
                    color: "bg-green-50 text-green-700 border-green-100",
                  },
                  {
                    role: "Accountant",
                    desc: "View/create invoices, reports, no booking access",
                    color: "bg-yellow-50 text-yellow-700 border-yellow-100",
                  },
                  {
                    role: "Talent Coordinator",
                    desc: "Manage talent profiles, portfolios",
                    color: "bg-indigo-50 text-indigo-700 border-indigo-100",
                  },
                  {
                    role: "Read-Only",
                    desc: "View everything, edit nothing",
                    color: "bg-gray-50 text-gray-700 border-gray-100",
                  },
                ].map((role) => (
                  <div
                    key={role.role}
                    className={`p-5 rounded-xl border ${role.color} flex flex-col shadow-sm`}
                  >
                    <span className="text-base font-bold mb-1.5">
                      {role.role}
                    </span>
                    <span className="text-sm font-medium opacity-90">
                      {role.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 p-6 border-b border-gray-100 bg-gray-50/50">
                <h4 className="text-lg font-bold text-gray-900">
                  Team Members (6)
                </h4>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search team members by name or email..."
                    className="pl-9 h-10 bg-white border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  {
                    name: "Sarah Johnson",
                    email: "sarah@agency.com",
                    role: "Admin",
                    status: "Active",
                    lastActive: "Jan 12, 2026 10:30 AM",
                    joined: "Jun 15, 2023",
                    avatar: "SJ",
                  },
                  {
                    name: "Michael Chen",
                    email: "michael@agency.com",
                    role: "Booker",
                    status: "Active",
                    lastActive: "Jan 12, 2026 9:15 AM",
                    joined: "Aug 22, 2023",
                    avatar: "MC",
                  },
                  {
                    name: "Emily Rodriguez",
                    email: "emily@agency.com",
                    role: "Scout",
                    status: "Away",
                    lastActive: "Jan 11, 2026 4:30 PM",
                    joined: "Sep 10, 2023",
                    avatar: "ER",
                  },
                  {
                    name: "David Kim",
                    email: "david@agency.com",
                    role: "Accountant",
                    status: "Active",
                    lastActive: "Jan 12, 2026 8:00 AM",
                    joined: "Jul 1, 2023",
                    avatar: "DK",
                  },
                ].map((user) => (
                  <div
                    key={user.email}
                    className="flex flex-col px-2 py-4 sm:p-6 hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-2 sm:gap-4 w-full">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm sm:text-lg shrink-0">
                        {user.avatar}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2">
                        <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
                          {user.name}
                        </p>
                        <Badge
                          variant="secondary"
                          className="bg-purple-50 text-purple-700 font-bold text-[10px] sm:text-xs h-5 sm:h-6 px-1 sm:px-2 shrink-0"
                        >
                          {user.role}
                        </Badge>
                        <div className="flex items-center gap-1 shrink-0">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${user.status === "Active"
                              ? "bg-green-500"
                              : "bg-yellow-500"
                              }`}
                          />
                          <span className="text-[10px] sm:text-xs text-green-600 font-bold uppercase tracking-wider hidden xs:inline">
                            {user.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMember(user);
                            setShowPermissionsModal(true);
                          }}
                          className="h-8 w-8 sm:h-9 sm:w-auto sm:px-4 text-xs sm:text-sm font-bold text-gray-700 border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2 rounded-lg sm:rounded-xl"
                          title="Permissions"
                        >
                          <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Permissions</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMember(user);
                            setShowActivityModal(true);
                          }}
                          className="h-8 w-8 sm:h-9 sm:w-auto sm:px-4 text-xs sm:text-sm font-bold text-gray-700 border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2 rounded-lg sm:rounded-xl"
                          title="Activity"
                        >
                          <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Activity</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg sm:rounded-xl"
                            >
                              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-56 rounded-xl p-2"
                          >
                            <DropdownMenuItem className="font-bold text-gray-700 cursor-pointer py-2.5 rounded-lg">
                              <Edit2 className="w-4 h-4 mr-3" /> Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem className="font-bold text-gray-700 cursor-pointer py-2.5 rounded-lg">
                              <Mail className="w-4 h-4 mr-3" /> Resend Invite
                            </DropdownMenuItem>
                            <div className="h-px bg-gray-100 my-1" />
                            <DropdownMenuItem className="font-bold text-red-600 cursor-pointer py-2.5 rounded-lg">
                              <XCircle className="w-4 h-4 mr-3" /> Deactivate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="font-bold text-red-600 cursor-pointer py-2.5 rounded-lg">
                              <Trash2 className="w-4 h-4 mr-3" /> Remove User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="mt-1.5 sm:mt-1 ml-[48px] sm:ml-[72px] flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">
                        {user.email}
                      </p>
                      <div className="flex items-center gap-3">
                        <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                          <span className="text-gray-400">Last active:</span>{" "}
                          {user.lastActive}
                        </p>
                        <span className="hidden sm:inline text-gray-300">
                          •
                        </span>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                          <span className="text-gray-400">Joined:</span>{" "}
                          {user.joined}
                        </p>
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
                <h3 className="text-lg font-bold text-gray-900">
                  Integrations
                </h3>
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

            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl mt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1 tracking-tight">
                API Keys
              </h3>
              <p className="text-sm text-gray-500 font-medium mb-6">
                Manage API keys for custom integrations
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Production API Key
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showProdKey ? "text" : "password"}
                        value={prodKey}
                        onChange={(e) => setProdKey(e.target.value)}
                        className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl pr-12"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowProdKey(!showProdKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-gray-600"
                      >
                        {showProdKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-xl border-gray-200 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(prodKey);
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Test API Key
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showTestKey ? "text" : "password"}
                        value={testKey}
                        onChange={(e) => setTestKey(e.target.value)}
                        className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl pr-12"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowTestKey(!showTestKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-gray-600"
                      >
                        {showTestKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-xl border-gray-200 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(testKey);
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 font-bold rounded-xl h-10 px-4 mt-2"
                >
                  Regenerate API Keys
                </Button>
              </div>
            </Card>
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
    </div>
  );
};

export default GeneralSettingsView;
