import React, { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CampaignModal } from "../Modals/CampaignModal";
import { toast } from "@/components/ui/use-toast";

export const CampaignsTab = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["bookings-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings_campaigns")
        .select("*, booking:bookings(id, talent_name, client_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bookings_campaigns")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings-campaigns"] });
      toast({ title: "Campaign deleted" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "created":
        return <Badge variant="secondary">Created</Badge>;
      case "ongoing":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            Ongoing
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Campaigns</h2>
          <p className="text-muted-foreground text-sm">
            Manage and organize your booking campaigns
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCampaign(null);
            setModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Linked Booking</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading campaigns...
                </TableCell>
              </TableRow>
            ) : campaigns?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No campaigns found. Create your first campaign to get started.
                </TableCell>
              </TableRow>
            ) : (
              campaigns?.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-semibold">
                    {campaign.name}
                  </TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell>
                    {campaign.duration_days
                      ? `${campaign.duration_days} days`
                      : "—"}
                  </TableCell>
                  <TableCell>{campaign.start_date || "—"}</TableCell>
                  <TableCell>
                    {campaign.booking ? (
                      <div className="text-sm">
                        <span className="text-indigo-600 truncate block max-w-[150px]">
                          {campaign.booking.talent_name}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {campaign.booking.client_name}
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingCampaign(campaign);
                          setModalOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to delete this campaign?",
                            )
                          ) {
                            deleteMutation.mutate(campaign.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {modalOpen && (
        <CampaignModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          initialData={editingCampaign}
        />
      )}
    </div>
  );
};
