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
} from "lucide-react";
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
import { scoutingService } from "@/services/scoutingService";
import { ScoutingProspect } from "@/types/scouting";

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
    status: "new_lead",
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
        status: formData.status || "new_lead",
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
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    formData.categories?.includes(cat)
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
                    <SelectItem value="new_lead">New Lead</SelectItem>
                    <SelectItem value="in_contact">In Contact</SelectItem>
                    <SelectItem value="test_shoot_pending">
                      Test Shoot (Pending)
                    </SelectItem>
                    <SelectItem value="test_shoot_success">
                      Test Shoot (Success)
                    </SelectItem>
                    <SelectItem value="test_shoot_failed">
                      Test Shoot (Failed)
                    </SelectItem>
                    <SelectItem value="offer_sent">
                      Offer Sent (Awaiting)
                    </SelectItem>
                    <SelectItem value="opened">
                      Offer Opened (Awaiting)
                    </SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
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
                    className={`w-8 h-8 pointer-events-none ${
                      (formData.rating || 0) >= i
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
      count: prospects.filter((p) => p.status === "new_lead").length,
      color: "border-blue-200 bg-blue-50/30",
    },
    {
      label: "In Contact",
      count: prospects.filter((p) => p.status === "in_contact").length,
      color: "border-yellow-200 bg-yellow-50/30",
    },
    {
      label: "Test Shoots",
      count: prospects.filter((p) => p.status.startsWith("test_shoot_")).length,
      color: "border-purple-200 bg-purple-50/30",
    },
    {
      label: "Offers Sent",
      count: prospects.filter((p) =>
        ["offer_sent", "opened", "signed", "declined"].includes(p.status),
      ).length,
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
                <SelectItem value="new_lead">New Lead</SelectItem>
                <SelectItem value="in_contact">In Contact</SelectItem>
                <SelectItem value="test_shoot_pending">
                  Test Shoot (Pending)
                </SelectItem>
                <SelectItem value="test_shoot_success">
                  Test Shoot (Success)
                </SelectItem>
                <SelectItem value="test_shoot_failed">
                  Test Shoot (Failed)
                </SelectItem>
                <SelectItem value="offer_sent">Offer Sent</SelectItem>
                <SelectItem value="opened">Offer Opened</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
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
                      {prospect.status}
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
