import React, { useState, useEffect } from "react";
import {
  Search,
  Instagram,
  Plus,
  Mail,
  Phone,
  Target,
  Star,
  Edit,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Globe,
  CheckCircle2,
  RefreshCw,
  DollarSign,
} from "lucide-react";

// Format prospect status for display
const formatProspectStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'new': 'New Lead',
    'contacted': 'Contacted',
    'meeting': 'Meeting Scheduled',
    'test_shoot': 'Test Shoot',
    'offer_sent': 'Offer Sent',
    'signed': 'Signed',
    'declined': 'Declined'
  };
  return statusMap[status] || status;
};
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { scoutingService } from "@/services/scoutingService";
import { ScoutingProspect, ScoutingEvent } from "@/types/scouting";
import { ScoutingTrips } from "./ScoutingTrips";

export const CreateEventModal = ({
  open,
  onOpenChange,
  onSuccess,
  event = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  event?: ScoutingEvent | null;
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basics");
  const [formData, setFormData] = useState<Partial<ScoutingEvent>>({
    status: "draft",
    event_type: "Open Call",
    looking_for: [],
    min_age: 18,
    max_age: 30,
    gender_preference: "all",
    registration_required: false,
    event_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (event) {
      setFormData(event);
    } else {
      setFormData({
        status: "draft",
        event_type: "Open Call",
        looking_for: [],
        min_age: 18,
        max_age: 30,
        gender_preference: "all",
        registration_required: false,
        event_date: new Date().toISOString().split("T")[0],
      });
    }
  }, [event, open]);

  const handleInputChange = (field: keyof ScoutingEvent, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLookingForToggle = (category: string) => {
    setFormData((prev) => {
      const current = prev.looking_for || [];
      if (current.includes(category)) {
        return { ...prev, looking_for: current.filter((c) => c !== category) };
      }
      return { ...prev, looking_for: [...current, category] };
    });
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({
        title: "Missing Information",
        description: "Please enter an event title.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const agencyId = await scoutingService.getUserAgencyId();

      if (!agencyId) {
        toast({
          title: "Error",
          description: "Could not identify your agency.",
          variant: "destructive",
        });
        return;
      }

      if (event) {
        await scoutingService.updateEvent(event.id, formData);
      } else {
        await scoutingService.createEvent({
          ...formData,
          agency_id: agencyId,
          name: formData.name!,
          event_date: formData.event_date!,
          location: formData.location || "TBD",
          status: formData.status || "draft",
        } as any);
      }

      if (onSuccess) onSuccess();
      toast({
        title: "Success",
        description: `Event ${event ? "updated" : "created"} successfully`
      });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: `Failed to ${event ? "update" : "create"} event`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-2xl">
        <div className="p-6 pb-8 bg-white">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">
              {event ? "Edit Casting Event" : "Create Casting Event"}
            </DialogTitle>
            <p className="text-xs text-gray-500 font-medium">
              Schedule an open call, casting, or audition for your talent search
            </p>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full bg-gray-50 p-1 rounded-xl mb-6">
              <TabsTrigger
                value="basics"
                className="rounded-lg font-semibold text-xs py-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all"
              >
                Basics
              </TabsTrigger>
              <TabsTrigger
                value="requirements"
                className="rounded-lg font-semibold text-xs py-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all"
              >
                Requirements
              </TabsTrigger>
              <TabsTrigger
                value="logistics"
                className="rounded-lg font-semibold text-xs py-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all"
              >
                Logistics
              </TabsTrigger>
              <TabsTrigger
                value="contact"
                className="rounded-lg font-semibold text-xs py-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all"
              >
                Contact
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basics" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Event Title *</Label>
                  <Input
                    placeholder="Winter 2026 Model Search"
                    value={formData.name || ""}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="h-10 rounded-lg border-gray-200 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Event Type *</Label>
                  <Select
                    value={formData.event_type}
                    onValueChange={(val) => handleInputChange("event_type", val)}
                  >
                    <SelectTrigger className="h-10 rounded-lg border-gray-200 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open Call">Open Call</SelectItem>
                      <SelectItem value="Private Casting">Private Casting</SelectItem>
                      <SelectItem value="Virtual Audition">Virtual Audition</SelectItem>
                      <SelectItem value="Go-See">Go-See</SelectItem>
                      <SelectItem value="Test Shoot">Test Shoot</SelectItem>
                      <SelectItem value="Model Search">Model Search</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Casting For</Label>
                <Input
                  placeholder="Spring Campaign for Nike"
                  value={formData.casting_for || ""}
                  onChange={(e) => handleInputChange("casting_for", e.target.value)}
                  className="h-10 rounded-lg border-gray-200 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Event Description</Label>
                <Textarea
                  placeholder="We're looking for fresh faces for our upcoming campaign..."
                  value={formData.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="min-h-[100px] rounded-lg border-gray-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Event Date *</Label>
                  <Input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => handleInputChange("event_date", e.target.value)}
                    className="h-10 rounded-lg border-gray-200 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Start Time</Label>
                  <Input
                    type="time"
                    value={formData.start_time || ""}
                    onChange={(e) => handleInputChange("start_time", e.target.value)}
                    className="h-10 rounded-lg border-gray-200 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">End Time</Label>
                  <Input
                    type="time"
                    value={formData.end_time || ""}
                    onChange={(e) => handleInputChange("end_time", e.target.value)}
                    className="h-10 rounded-lg border-gray-200 text-sm"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="requirements" className="space-y-4 mt-0">
              <div className="space-y-3">
                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Looking For (Select all that apply)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    "Model", "Actor", "Dancer", "Singer", "Influencer", "Athlete", "Child Talent", "Plus Size", "Fitness"
                  ].map((cat) => (
                    <div
                      key={cat}
                      className={`flex items-center space-x-2.5 p-2.5 rounded-lg border transition-all cursor-pointer hover:border-indigo-200 ${formData.looking_for?.includes(cat)
                        ? "border-indigo-500 bg-indigo-50/30"
                        : "border-gray-100 bg-white"
                        }`}
                      onClick={() => handleLookingForToggle(cat)}
                    >
                      <Checkbox
                        checked={formData.looking_for?.includes(cat)}
                        onCheckedChange={() => handleLookingForToggle(cat)}
                        className="h-4 w-4 rounded border-gray-300 data-[state=checked]:bg-indigo-600"
                      />
                      <span className="text-xs font-semibold text-gray-800">{cat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Minimum Age</Label>
                  <Input
                    type="number"
                    value={formData.min_age || ""}
                    onChange={(e) => handleInputChange("min_age", parseInt(e.target.value))}
                    className="h-10 rounded-lg border-gray-200 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Maximum Age</Label>
                  <Input
                    type="number"
                    value={formData.max_age || ""}
                    onChange={(e) => handleInputChange("max_age", parseInt(e.target.value))}
                    className="h-10 rounded-lg border-gray-200 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Gender Preference</Label>
                <div className="grid grid-cols-4 gap-2">
                  {["All", "Female", "Male", "Non-binary"].map((gender) => (
                    <div
                      key={gender}
                      className={`flex items-center justify-center p-2.5 rounded-lg border font-semibold text-xs transition-all cursor-pointer ${formData.gender_preference === gender.toLowerCase()
                        ? "border-indigo-500 bg-indigo-50/30 text-indigo-700"
                        : "border-gray-100 bg-white text-gray-600 hover:border-gray-200"
                        }`}
                      onClick={() => handleInputChange("gender_preference", gender.toLowerCase())}
                    >
                      {gender}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Special Skills / Requirements</Label>
                <Textarea
                  placeholder="e.g., Must be able to swim, Bilingual in Spanish, Dancing experience"
                  value={formData.special_skills || ""}
                  onChange={(e) => handleInputChange("special_skills", e.target.value)}
                  className="rounded-lg border-gray-200 text-sm min-h-[60px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">What to Bring</Label>
                <Textarea
                  placeholder="e.g., Comp card, headshot, comfortable clothing"
                  value={formData.what_to_bring || ""}
                  onChange={(e) => handleInputChange("what_to_bring", e.target.value)}
                  className="rounded-lg border-gray-200 text-sm min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Dress Code</Label>
                  <Input
                    placeholder="e.g., Fitted black clothing, minimal makeup"
                    value={formData.dress_code || ""}
                    onChange={(e) => handleInputChange("dress_code", e.target.value)}
                    className="h-10 rounded-lg border-gray-200 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Targeted Talent Goal</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 20"
                    value={formData.targeted_talent_goal || ""}
                    onChange={(e) => handleInputChange("targeted_talent_goal", parseInt(e.target.value))}
                    className="h-10 rounded-lg border-gray-200 text-sm"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="logistics" className="space-y-4 mt-0">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Location Address</Label>
                <Input
                  placeholder="123 Main St, New York, NY 10001"
                  value={formData.location || ""}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className="h-10 rounded-lg border-gray-200 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Location Details / Instructions</Label>
                <Textarea
                  placeholder="Enter through side entrance, take elevator to 3rd floor"
                  value={formData.location_details || ""}
                  onChange={(e) => handleInputChange("location_details", e.target.value)}
                  className="rounded-lg border-gray-200 text-sm min-h-[80px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Virtual Meeting Link (if applicable)</Label>
                <Input
                  placeholder="https://zoom.us/j/..."
                  value={formData.virtual_link || ""}
                  onChange={(e) => handleInputChange("virtual_link", e.target.value)}
                  className="h-10 rounded-lg border-gray-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Maximum Attendees</Label>
                  <Input
                    type="number"
                    placeholder="50"
                    value={formData.max_attendees || ""}
                    onChange={(e) => handleInputChange("max_attendees", parseInt(e.target.value))}
                    className="h-10 rounded-lg border-gray-200 text-sm"
                  />
                </div>
                <div className="flex items-center space-x-2.5 p-2.5 rounded-lg border border-gray-100 h-10">
                  <Checkbox
                    id="reg-required"
                    checked={formData.registration_required}
                    onCheckedChange={(val) => handleInputChange("registration_required", val)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="reg-required" className="text-xs font-semibold text-gray-800 cursor-pointer">Registration Required</Label>
                </div>
              </div>

              {formData.registration_required && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Registration Fee ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={formData.registration_fee || ""}
                      onChange={(e) => handleInputChange("registration_fee", parseFloat(e.target.value))}
                      className="h-10 rounded-lg border-gray-200 text-sm pl-9"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium italic">Leave at 0.00 for free registration</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Internal Notes</Label>
                <Textarea
                  placeholder="Internal notes about the event..."
                  value={formData.internal_notes || ""}
                  onChange={(e) => handleInputChange("internal_notes", e.target.value)}
                  className="rounded-lg border-gray-200 text-sm min-h-[80px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-0">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Contact Name</Label>
                <Input
                  placeholder="Jane Smith"
                  value={formData.contact_name || ""}
                  onChange={(e) => handleInputChange("contact_name", e.target.value)}
                  className="h-10 rounded-lg border-gray-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Contact Email</Label>
                  <Input
                    placeholder="casting@agency.com"
                    value={formData.contact_email || ""}
                    onChange={(e) => handleInputChange("contact_email", e.target.value)}
                    className="h-10 rounded-lg border-gray-200 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Contact Phone</Label>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    value={formData.contact_phone || ""}
                    onChange={(e) => handleInputChange("contact_phone", e.target.value)}
                    className="h-10 rounded-lg border-gray-200 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Event Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => handleInputChange("status", val)}
                >
                  <SelectTrigger className="h-10 rounded-lg border-gray-200 text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft (Not Visible)</SelectItem>
                    <SelectItem value="published">Published (Visible)</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-gray-50">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 px-6 rounded-lg font-bold text-xs text-gray-600 border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm flex items-center gap-2 text-xs"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              {event ? "Update Event" : "Create Event"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const AddProspectModal = ({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<ScoutingProspect>>({
    status: "new",
    source: "instagram",
    categories: [],
    rating: 0,
    discovery_date: new Date().toISOString().split("T")[0],
  });

  const handleInputChange = (field: keyof ScoutingProspect, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryToggle = (category: string) => {
    setFormData((prev) => {
      const cats = prev.categories || [];
      if (cats.includes(category)) {
        return { ...prev, categories: cats.filter((c) => c !== category) };
      }
      return { ...prev, categories: [...cats, category] };
    });
  };

  const handleSubmit = async () => {
    if (!formData.full_name) {
      toast({
        title: "Missing Information",
        description: "Please enter a name for the prospect.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const agencyId = await scoutingService.getUserAgencyId();

      if (!agencyId) {
        toast({
          title: "Error",
          description:
            "Could not identify your agency. Please ensure you are logged in as an agency member.",
          variant: "destructive",
        });
        return;
      }

      // Check for duplicates
      const existing = await scoutingService.checkDuplicate(
        agencyId,
        formData.email,
        formData.instagram_handle,
      );

      if (existing) {
        toast({
          title: "Prospect Already Exists",
          description: `This prospect (${existing.full_name}) is already in your pipeline with the same ${existing.email === formData.email ? "email" : "Instagram handle"}.`,
          variant: "destructive",
        });
        return;
      }

      await scoutingService.createProspect({
        ...formData,
        agency_id: agencyId,
        full_name: formData.full_name!,
        status: formData.status || "new",
      } as any);

      toast({
        title: "Success",
        description: "Prospect added successfully",
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to add prospect",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Add New Prospect
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
                  value={formData.full_name || ""}
                  onChange={(e) =>
                    handleInputChange("full_name", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="email@example.com"
                  value={formData.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram Handle</Label>
                <Input
                  id="instagram"
                  placeholder="@username"
                  value={formData.instagram_handle || ""}
                  onChange={(e) =>
                    handleInputChange("instagram_handle", e.target.value)
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
                <button
                  key={cat}
                  type="button"
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${formData.categories?.includes(cat)
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCategoryToggle(cat);
                  }}
                >
                  {cat}
                </button>
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
                    value={formData.discovery_date}
                    onChange={(e) =>
                      handleInputChange("discovery_date", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Discovery Location</Label>
                <Input
                  placeholder="New York, NY"
                  value={formData.discovery_location || ""}
                  onChange={(e) =>
                    handleInputChange("discovery_location", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Referred By</Label>
                <Input
                  placeholder="Name of referrer"
                  value={formData.referred_by || ""}
                  onChange={(e) =>
                    handleInputChange("referred_by", e.target.value)
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
                    <SelectItem value="new">New Lead</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="meeting">Meeting Scheduled</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned Agent</Label>
                <Input
                  placeholder="Agent name"
                  value={formData.assigned_agent_name || ""}
                  onChange={(e) =>
                    handleInputChange("assigned_agent_name", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2">Star Rating</h3>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  className="focus:outline-none transition-transform hover:scale-110 p-1 rounded-full hover:bg-gray-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleInputChange("rating", i);
                  }}
                >
                  <Star
                    className={`w-8 h-8 pointer-events-none ${(formData.rating || 0) >= i
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                      }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Internal Notes</Label>
            <Textarea
              placeholder="Add notes about this prospect..."
              className="h-32"
              value={formData.notes || ""}
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
                  value={formData.instagram_followers || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "instagram_followers",
                      parseInt(e.target.value),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Engagement Rate (%)</Label>
                <Input
                  type="number"
                  value={formData.engagement_rate || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "engagement_rate",
                      parseFloat(e.target.value),
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Prospect"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const ProspectPipelineTab = ({
  onAddProspect,
  refreshTrigger,
}: {
  onAddProspect: () => void;
  refreshTrigger?: any;
}) => {
  const [prospects, setProspects] = useState<ScoutingProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchProspects = async () => {
    try {
      setLoading(true);
      const agencyId = await scoutingService.getUserAgencyId();
      console.log("Fetching prospects for agency:", agencyId);
      if (agencyId) {
        const data = await scoutingService.getProspects(agencyId);
        console.log("Fetched prospects:", data);
        setProspects(data);
      } else {
        console.warn("No agency ID found for current user");
        setProspects([]);
      }
    } catch (error) {
      console.error("Failed to fetch prospects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProspects();
  }, [refreshTrigger]);

  const filteredProspects = prospects.filter((p) => {
    const matchesSearch = p.full_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    {
      label: "New Leads",
      count: prospects.filter((p) => p.status === "new").length,
      color: "border-blue-200 bg-blue-50/30",
    },
    {
      label: "In Contact",
      count: prospects.filter((p) => p.status === "contacted").length,
      color: "border-yellow-200 bg-yellow-50/30",
    },
    {
      label: "Test Shoots",
      count: prospects.filter((p) => p.status === "meeting").length,
      color: "border-purple-200 bg-purple-50/30",
    },
    {
      label: "Offers Sent",
      count: prospects.filter((p) => p.status === "signed").length,
      color: "border-green-200 bg-green-50/30",
    },
  ];

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
                className="pl-10 h-10 border-gray-200 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-10 border-gray-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New Lead</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm"
              onClick={onAddProspect}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Prospect
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Loading prospects...
            </div>
          ) : filteredProspects.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm || statusFilter !== "all"
                ? "No prospects match your filters."
                : "No prospects found. Add one to get started!"}
            </div>
          ) : (
            filteredProspects.map((prospect) => (
              <div
                key={prospect.id}
                className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-bold text-lg shrink-0">
                  {prospect.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 truncate">
                      {prospect.full_name}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-600 font-medium text-[10px]"
                    >
                      {formatProspectStatus(prospect.status)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {prospect.categories?.map((cat) => (
                      <Badge
                        key={cat}
                        variant="outline"
                        className="bg-white border-gray-200 text-gray-500 font-medium text-[10px]"
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium">
                    {prospect.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        {prospect.email}
                      </div>
                    )}
                    {prospect.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {prospect.phone}
                      </div>
                    )}
                    {prospect.instagram_handle && (
                      <div className="flex items-center gap-1.5">
                        <Instagram className="w-3.5 h-3.5" />
                        {prospect.instagram_handle}
                        {prospect.instagram_followers &&
                          ` (${(prospect.instagram_followers / 1000).toFixed(1)}k followers)`}
                      </div>
                    )}
                    {prospect.source && (
                      <div className="flex items-center gap-1.5 capitalize">
                        <Target className="w-3.5 h-3.5" />
                        {prospect.source}
                        {prospect.discovery_date &&
                          ` • ${new Date(prospect.discovery_date).toLocaleDateString()}`}
                      </div>
                    )}
                    {(prospect.rating || 0) > 0 && (
                      <div className="flex items-center gap-0.5 text-yellow-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {Array.from({ length: prospect.rating || 0 }).map(
                          (_, i) => (
                            <Star
                              key={i}
                              className="w-3.5 h-3.5 fill-current"
                            />
                          ),
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    Assigned to: {prospect.assigned_agent_name || "Unassigned"}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-indigo-600"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-600"
                    onClick={async () => {
                      if (
                        confirm(
                          "Are you sure you want to delete this prospect?",
                        )
                      ) {
                        await scoutingService.deleteProspect(prospect.id);
                        window.location.reload();
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
