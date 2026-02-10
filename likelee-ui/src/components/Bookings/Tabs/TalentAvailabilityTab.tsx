import React, { useEffect, useMemo, useState } from "react";
import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { AddBookOutModal } from "../Modals/AddBookOutModal";
import { getAgencyTalents } from "@/api/functions";

export const TalentAvailabilityTab = ({
  bookOuts = [],
  onAddBookOut,
  onRemoveBookOut,
  fixedTalent,
}: {
  bookOuts?: any[];
  onAddBookOut: (bookOut: any) => void;
  onRemoveBookOut: (id: string) => void;
  fixedTalent?: { id: string; name: string };
}) => {
  const [addBookOutOpen, setAddBookOutOpen] = useState(false);
  const { toast } = useToast();

  // Load real talents and map id -> name
  const [talents, setTalents] = useState<any[]>([]);
  useEffect(() => {
    if (fixedTalent?.id) {
      setTalents([{ id: fixedTalent.id, name: fixedTalent.name }]);
      return;
    }
    let cancelled = false;
    (async () => {
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
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of talents) m.set(String(t.id), String(t.name));
    return m;
  }, [talents]);
  const getTalentName = (id: string) =>
    nameById.get(String(id)) || "Unknown Talent";

  const fmtDate = (v?: string) => {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d.getTime())) return v; // show raw if not ISO parseable
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const fmtReason = (r?: string) =>
    String(r || "personal")
      .replace("_", " ")
      .toLowerCase();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Talent Availability
          </h2>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Manage book-outs and talent unavailability
          </p>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          onClick={() => setAddBookOutOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Book-Out
        </Button>
      </div>

      {bookOuts.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center text-center h-[400px]">
          <div className="bg-gray-50 p-4 rounded-full mb-4">
            <Calendar className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            No book-outs scheduled
          </h3>
          <p className="text-gray-500 max-w-md">
            Add unavailability periods for your talent
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookOuts.map((bo) => {
            const talentId = bo.talentId || bo.talent_id;
            const start = bo.startDate || bo.start_date;
            const end = bo.endDate || bo.end_date || start;
            const reason = fmtReason(bo.reason);
            return (
              <Card
                key={bo.id}
                className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#FFF9F5] border-orange-200"
              >
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-gray-900 text-lg">
                    {getTalentName(talentId)}
                  </h4>
                  <p className="text-sm text-gray-500 font-medium mb-2">
                    {fmtDate(start)} - {fmtDate(end)}
                  </p>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-orange-100 text-orange-800 capitalize">
                      {reason}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 font-bold px-4"
                    onClick={() => {
                      const ok = window.confirm(
                        "Delete Book-Out? This action cannot be undone.",
                      );
                      if (!ok) return;
                      try {
                        onRemoveBookOut(bo.id);
                      } catch (_e) {
                        toast({
                          title: "Remove failed",
                          description: "Failed to remove book-out.",
                          variant: "destructive" as any,
                        });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AddBookOutModal
        open={addBookOutOpen}
        onOpenChange={setAddBookOutOpen}
        onAdd={onAddBookOut}
      />
    </div>
  );
};
