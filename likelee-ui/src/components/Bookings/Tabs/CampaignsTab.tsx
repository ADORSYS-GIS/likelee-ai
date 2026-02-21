import React, { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteChecking, setDeleteChecking] = useState(false);
  const [deleteHasActiveBookings, setDeleteHasActiveBookings] =
    useState(false);
  const [deleteTargetCampaign, setDeleteTargetCampaign] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["bookings-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings_campaigns")
        .select("*, bookings:bookings(id, talent_name, client_name)")
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

  const usageDurationDaysFromText = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const n = typeof v === "number" ? v : Number(String(v).trim());
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  };

  const checkHasActiveBookings = async (campaignId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("bookings")
      .select("id,created_at,usage_duration")
      .eq("campaign_id", campaignId);

    if (error) {
      return true;
    }

    const rows = Array.isArray(data) ? data : [];
    const nowMs = Date.now();
    for (const b of rows) {
      const createdAt = b?.created_at;
      if (!createdAt) {
        return true;
      }
      const createdMs = new Date(createdAt).getTime();
      if (!Number.isFinite(createdMs)) {
        return true;
      }
      const durDays = usageDurationDaysFromText(b?.usage_duration);
      if (durDays === null) {
        return true;
      }
      const endsMs = createdMs + durDays * 24 * 60 * 60 * 1000;
      if (nowMs < endsMs) {
        return true;
      }
    }
    return false;
  };

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
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 rounded-xl"
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
              <TableHead>Bookings</TableHead>
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
                    {campaign.bookings && campaign.bookings.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit">
                          {campaign.bookings.length} Booking
                          {campaign.bookings.length > 1 ? "s" : ""}
                        </Badge>
                        <div className="text-xs text-gray-400 truncate max-w-[150px]">
                          {campaign.bookings
                            .map((b: any) => b.talent_name)
                            .join(", ")}
                        </div>
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
                        onClick={async () => {
                          setDeleteTargetCampaign(campaign);
                          setDeleteDialogOpen(true);
                          setDeleteChecking(true);
                          try {
                            const hasActive = await checkHasActiveBookings(
                              campaign.id,
                            );
                            setDeleteHasActiveBookings(hasActive);
                          } finally {
                            setDeleteChecking(false);
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteChecking
                ? "Checking linked bookings..."
                : deleteHasActiveBookings
                  ? "This campaign has ongoing bookings. Deleting it will also delete those bookings. Do you want to continue?"
                  : "Are you sure you want to delete this campaign?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteChecking || deleteMutation.isPending}
              onClick={() => {
                setDeleteTargetCampaign(null);
                setDeleteHasActiveBookings(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                deleteChecking ||
                deleteMutation.isPending ||
                !deleteTargetCampaign?.id
              }
              onClick={() => {
                const id = deleteTargetCampaign?.id;
                setDeleteDialogOpen(false);
                setDeleteTargetCampaign(null);
                setDeleteHasActiveBookings(false);
                if (id) {
                  deleteMutation.mutate(id);
                }
              }}
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
