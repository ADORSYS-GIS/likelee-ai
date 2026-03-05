import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

export const CampaignModal = ({
  open,
  onOpenChange,
  initialData,
  onSaveSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  onSaveSuccess?: (campaign: any) => void;
}) => {
  const [formData, setFormData] = useState({
    name: "",
    status: "created",
    duration_days: "",
    start_date: "",
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        status: initialData.status || "created",
        duration_days: initialData.duration_days?.toString() || "",
        start_date: initialData.start_date || "",
      });
    } else {
      setFormData({
        name: "",
        status: "created",
        duration_days: "",
        start_date: "",
      });
    }
  }, [initialData, open]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (initialData?.id) {
        const { data: updated, error } = await supabase
          .from("bookings_campaigns")
          .update(data)
          .eq("id", initialData.id)
          .select()
          .single();
        if (error) throw error;
        return updated;
      } else {
        const { data: created, error } = await supabase
          .from("bookings_campaigns")
          .insert([data])
          .select()
          .single();
        if (error) throw error;
        return created;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bookings-campaigns"] });
      toast({
        title: initialData?.id ? "Campaign updated" : "Campaign created",
      });
      if (onSaveSuccess) onSaveSuccess(data);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error saving campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast({
        title: "Please fill in the campaign name",
        variant: "destructive",
      });
      return;
    }

    const submissionData: any = {
      name: formData.name,
      status: formData.status,
      duration_days: formData.duration_days
        ? parseInt(formData.duration_days)
        : null,
      start_date: formData.start_date || null,
    };

    // Auto-logic: If status is ongoing and start_date is null, set to today
    if (submissionData.status === "ongoing" && !submissionData.start_date) {
      submissionData.start_date = new Date().toISOString().split("T")[0];
    }

    mutation.mutate(submissionData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Campaign" : "Create New Campaign"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. Summer Shoot 2024"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration_days}
                onChange={(e) =>
                  setFormData({ ...formData, duration_days: e.target.value })
                }
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) =>
                setFormData({ ...formData, start_date: e.target.value })
              }
            />
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-2 rounded-xl transition-all"
            >
              {mutation.isPending ? "Saving..." : "Save Campaign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
