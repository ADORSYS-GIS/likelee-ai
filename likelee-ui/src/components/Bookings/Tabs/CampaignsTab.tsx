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
import { useTranslation } from "react-i18next";

export const CampaignsTab = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteChecking, setDeleteChecking] = useState(false);
  const [deleteHasActiveBookings, setDeleteHasActiveBookings] = useState(false);
  const [deleteTargetCampaign, setDeleteTargetCampaign] = useState<any>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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
      toast({
        title: t("agencyDashboard.bookings.tabs.campaigns.campaignDeleted", {
          defaultValue: "Campaign deleted",
        }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("agencyDashboard.bookings.tabs.campaigns.errorDeleting", {
          defaultValue: "Error deleting campaign",
        }),
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

  const checkHasActiveBookings = async (
    campaignId: string,
  ): Promise<boolean> => {
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
        return (
          <Badge variant="secondary">
            {t("agencyDashboard.bookings.tabs.campaigns.statuses.created", {
              defaultValue: "Created",
            })}
          </Badge>
        );
      case "ongoing":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            {t("agencyDashboard.bookings.tabs.campaigns.statuses.ongoing", {
              defaultValue: "Ongoing",
            })}
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            {t("agencyDashboard.bookings.tabs.campaigns.statuses.completed", {
              defaultValue: "Completed",
            })}
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
          <h2 className="text-2xl font-bold">
            {t("agencyDashboard.bookings.tabs.campaigns.title", {
              defaultValue: "Campaigns",
            })}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("agencyDashboard.bookings.tabs.campaigns.subtitle", {
              defaultValue: "Manage and organize your booking campaigns",
            })}
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
          {t("agencyDashboard.bookings.tabs.campaigns.createCampaign", {
            defaultValue: "Create Campaign",
          })}
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("agencyDashboard.bookings.tabs.campaigns.campaignName", {
                  defaultValue: "Campaign Name",
                })}
              </TableHead>
              <TableHead>
                {t("agencyDashboard.bookings.tabs.campaigns.status", {
                  defaultValue: "Status",
                })}
              </TableHead>
              <TableHead>
                {t("agencyDashboard.bookings.tabs.campaigns.duration", {
                  defaultValue: "Duration",
                })}
              </TableHead>
              <TableHead>
                {t("agencyDashboard.bookings.tabs.campaigns.startDate", {
                  defaultValue: "Start Date",
                })}
              </TableHead>
              <TableHead>
                {t("agencyDashboard.bookings.tabs.campaigns.bookings", {
                  defaultValue: "Bookings",
                })}
              </TableHead>
              <TableHead className="text-right">
                {t("agencyDashboard.bookings.tabs.campaigns.actions", {
                  defaultValue: "Actions",
                })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {t(
                    "agencyDashboard.bookings.tabs.campaigns.loadingCampaigns",
                    { defaultValue: "Loading campaigns..." },
                  )}
                </TableCell>
              </TableRow>
            ) : campaigns?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  {t("agencyDashboard.bookings.tabs.campaigns.noCampaigns", {
                    defaultValue:
                      "No campaigns found. Create your first campaign to get started.",
                  })}
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
                      ? t("agencyDashboard.bookings.tabs.campaigns.days", {
                          count: campaign.duration_days,
                          defaultValue: `${campaign.duration_days} days`,
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>{campaign.start_date || "—"}</TableCell>
                  <TableCell>
                    {campaign.bookings && campaign.bookings.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit">
                          {t(
                            "agencyDashboard.bookings.tabs.campaigns.booking",
                            {
                              count: campaign.bookings.length,
                              defaultValue: `${campaign.bookings.length} Booking${campaign.bookings.length > 1 ? "s" : ""}`,
                            },
                          )}
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
            <AlertDialogTitle>
              {t("agencyDashboard.bookings.tabs.campaigns.deleteCampaign", {
                defaultValue: "Delete campaign",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteChecking
                ? t(
                    "agencyDashboard.bookings.tabs.campaigns.checkingLinkedBookings",
                    { defaultValue: "Checking linked bookings..." },
                  )
                : deleteHasActiveBookings
                  ? t(
                      "agencyDashboard.bookings.tabs.campaigns.hasOngoingBookings",
                      {
                        defaultValue:
                          "This campaign has ongoing bookings. Deleting it will also delete those bookings. Do you want to continue?",
                      },
                    )
                  : t("agencyDashboard.bookings.tabs.campaigns.confirmDelete", {
                      defaultValue:
                        "Are you sure you want to delete this campaign?",
                    })}
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
              {t("agencyDashboard.bookings.tabs.campaigns.cancel", {
                defaultValue: "Cancel",
              })}
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
              {t("agencyDashboard.bookings.tabs.campaigns.yes", {
                defaultValue: "Yes",
              })}
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
