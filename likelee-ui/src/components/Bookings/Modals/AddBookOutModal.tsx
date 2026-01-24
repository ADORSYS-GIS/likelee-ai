import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { getAgencyTalents } from "@/api/functions";

export const AddBookOutModal = ({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (bookOut: any) => void;
}) => {
  const [reason, setReason] = useState("personal");
  const [talentId, setTalentId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [talents, setTalents] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getAgencyTalents();
        if (cancelled) return;
        const mapped = Array.isArray(rows)
          ? rows.map((r: any) => ({
              id: r.id || r.user_id || r.creator_id,
              name: r.full_name || r.name || r.stage_name || "Unnamed",
            }))
          : [];
        setTalents(mapped);
      } catch (_) {
        setTalents([]);
      }
    };
    if (open) load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSave = () => {
    if (!talentId || !startDate || !endDate) {
      // Basic validation
      return;
    }

    const newBookOut = {
      id: `bo-${Date.now()}`,
      talentId,
      reason,
      startDate,
      endDate,
      notes,
    };

    onAdd(newBookOut);
    onOpenChange(false);

    // Reset form
    setReason("personal");
    setTalentId("");
    setStartDate("");
    setEndDate("");
    setNotes("");
  };

  const isValid = reason && talentId && startDate && endDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Talent Availability & Book-Outs
          </DialogTitle>
          <DialogDescription>
            Manage when talent is unavailable for bookings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="font-bold">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="other_booking">Other Booking</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Talent *</Label>
            <Select value={talentId} onValueChange={setTalentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select talent" />
              </SelectTrigger>
              <SelectContent>
                {talents.map((talent) => (
                  <SelectItem key={talent.id} value={talent.id}>
                    {talent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold">Start Date *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">End Date *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Notes</Label>
            <Textarea
              placeholder="Additional details..."
              className="min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input type="checkbox" id="notify" className="rounded" />
            <Label htmlFor="notify" className="font-normal cursor-pointer">
              Notify talent via email
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-bold"
          >
            Cancel
          </Button>
          <Button
            className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all ${
              !isValid ? "opacity-50 blur-[1px] pointer-events-none" : ""
            }`}
            onClick={handleSave}
            disabled={!isValid}
          >
            Save Book-Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
