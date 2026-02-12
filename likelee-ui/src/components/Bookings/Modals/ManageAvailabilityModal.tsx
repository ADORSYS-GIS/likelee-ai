import React, { useEffect, useMemo, useState } from "react";
import { Plus, Calendar, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AddBookOutModal } from "./AddBookOutModal";
import { getAgencyTalents } from "@/api/functions";

export const ManageAvailabilityModal = ({
  open,
  onOpenChange,
  bookOuts = [],
  onAddBookOut,
  onRemoveBookOut,
  fixedTalent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookOuts?: any[];
  onAddBookOut: (bookOut: any) => void;
  onRemoveBookOut: (id: string) => void;
  fixedTalent?: { id: string; name: string };
}) => {
  const [addOpen, setAddOpen] = useState(false);
  const [talents, setTalents] = useState<any[]>([]);

  useEffect(() => {
    if (fixedTalent?.id) {
      setTalents([{ id: fixedTalent.id, name: fixedTalent.name }]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getAgencyTalents();
        if (cancelled) return;
        const arr = Array.isArray(rows) ? rows : [];
        setTalents(
          arr.map((r: any) => ({
            id: r.id || r.user_id || r.creator_id,
            name: r.full_name || r.name || r.stage_name || "Unnamed",
          })),
        );
      } catch (_) {
        setTalents([]);
      }
    };
    if (open) load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of talents) m.set(String(t.id), String(t.name));
    return m;
  }, [talents]);

  const getTalentName = (bo: any) => {
    const id = bo.talentId || bo.talent_id;
    return nameById.get(String(id)) || String(id || "Unknown");
  };

  const fmtReason = (r?: string) =>
    String(r || "personal")
      .replace("_", " ")
      .toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Talent Availability & Book-Outs
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Manage when talent is unavailable for bookings
          </p>
        </DialogHeader>
        <div className="py-6">
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold mb-8 rounded-lg h-10"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Book-Out
          </Button>

          {bookOuts.length === 0 ? (
            <div className="border border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-gray-50 rounded-full mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">
                No book-outs scheduled
              </h3>
              <p className="text-sm text-gray-500">
                Talent will appear available for all dates
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookOuts.map((bo) => {
                const start = bo.startDate || bo.start_date;
                const end = bo.endDate || bo.end_date || start;
                const reason = fmtReason(bo.reason);
                return (
                  <Card
                    key={bo.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div className="text-sm">
                      <div className="font-bold text-gray-900">
                        {getTalentName(bo)}
                      </div>
                      <div className="text-gray-500">
                        {start} – {end} ·{" "}
                        <span className="capitalize">{reason}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => onRemoveBookOut(bo.id)}
                    >
                      <X className="w-4 h-4 mr-1" /> Remove
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <AddBookOutModal
          open={addOpen}
          onOpenChange={setAddOpen}
          onAdd={onAddBookOut}
          fixedTalent={fixedTalent}
        />
      </DialogContent>
    </Dialog>
  );
};
