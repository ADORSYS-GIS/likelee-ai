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
import { getAgencyRoster } from "@/api/functions";
import { useTranslation } from "react-i18next";

export const AddBookOutModal = ({
  open,
  onOpenChange,
  onAdd,
  fixedTalent,
  isSportsAgency = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (bookOut: any) => void;
  fixedTalent?: { id: string; name: string };
  isSportsAgency?: boolean;
}) => {
  const { t } = useTranslation();
  const entitySingularTitle = isSportsAgency ? "Athlete" : "Talent";
  const entitySingularLower = isSportsAgency ? "athlete" : "talent";
  const [reason, setReason] = useState("personal");
  const [talentId, setTalentId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [talents, setTalents] = useState<any[]>([]);
  const [notifyAgency, setNotifyAgency] = useState(true);

  useEffect(() => {
    if (fixedTalent?.id) {
      setTalents([{ id: fixedTalent.id, name: fixedTalent.name }]);
      setTalentId(fixedTalent.id);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const resp = await getAgencyRoster();
        if (cancelled) return;
        const rows = Array.isArray(resp)
          ? resp
          : Array.isArray((resp as any)?.talents)
            ? (resp as any).talents
            : Array.isArray((resp as any)?.data?.talents)
              ? (resp as any).data.talents
              : [];
        const mapped = Array.isArray(rows)
          ? rows.map((r: any) => ({
              id: r.id,
              name: r.full_name || r.name || r.stage_name || "Unnamed",
              creator_id: r.creator_id || null,
              relationship_id: r.relationship_id || null,
              relationship_type: r.relationship_type || "internal",
              contract_controlled: Boolean(r.contract_controlled),
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
  }, [open, fixedTalent?.id, fixedTalent?.name]);

  const handleSave = () => {
    if (!talentId || !startDate || !endDate) {
      // Basic validation
      return;
    }

    const newBookOut = {
      id: `bo-${Date.now()}`,
      talentId,
      creator_id: talents.find((talent) => talent.id === talentId)?.creator_id,
      relationship_id: talents.find((talent) => talent.id === talentId)
        ?.relationship_id,
      reason,
      startDate,
      endDate,
      notes,
      notifyAgency,
    };

    onAdd(newBookOut);
    onOpenChange(false);

    // Reset form
    setReason("personal");
    if (!fixedTalent?.id) setTalentId("");
    setStartDate("");
    setEndDate("");
    setNotes("");
    setNotifyAgency(true);
  };

  const isValid = reason && talentId && startDate && endDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {t("talentPortal.content.irl.availability.manageModalTitle", {
              entity: entitySingularTitle,
            })}
          </DialogTitle>
          <DialogDescription>
            {t("talentPortal.content.irl.availability.manageModalDescription", {
              entity: entitySingularLower,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="font-bold">
              {t("talentPortal.content.irl.addBookOut.fields.reason")} *
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">
                  {t("talentPortal.content.irl.bookOutReasons.personal")}
                </SelectItem>
                <SelectItem value="medical">
                  {t("talentPortal.content.irl.bookOutReasons.medical")}
                </SelectItem>
                <SelectItem value="vacation">
                  {t("talentPortal.content.irl.bookOutReasons.vacation")}
                </SelectItem>
                <SelectItem value="other_booking">
                  {t("talentPortal.content.irl.bookOutReasons.other_booking")}
                </SelectItem>
                <SelectItem value="other">
                  {t("talentPortal.content.irl.bookOutReasons.other")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">
              {t("talentPortal.content.irl.addBookOut.fields.entity", {
                entity: entitySingularTitle,
              })}{" "}
              *
            </Label>
            {fixedTalent?.id ? (
              <Input value={fixedTalent.name} readOnly className="bg-gray-50" />
            ) : (
              <Select value={talentId} onValueChange={setTalentId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "talentPortal.content.irl.addBookOut.fields.selectEntity",
                      {
                        entity: entitySingularLower,
                      },
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {talents.map((talent) => (
                    <SelectItem key={talent.id} value={talent.id}>
                      {talent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold">
                {t("talentPortal.content.irl.addBookOut.fields.startDate")} *
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">
                {t("talentPortal.content.irl.addBookOut.fields.endDate")} *
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">
              {t("talentPortal.content.irl.addBookOut.fields.notes")}
            </Label>
            <Textarea
              placeholder={t(
                "talentPortal.content.irl.addBookOut.fields.additionalDetails",
              )}
              className="min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="notify"
              className="rounded"
              checked={notifyAgency}
              onChange={(e) => setNotifyAgency(e.target.checked)}
            />
            <Label htmlFor="notify" className="font-normal cursor-pointer">
              {fixedTalent?.id
                ? t("talentPortal.content.irl.addBookOut.fields.notifyAgency")
                : t("talentPortal.content.irl.addBookOut.fields.notifyEntity", {
                    entity: entitySingularLower,
                  })}
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-bold"
          >
            {t("talentPortal.content.irl.shared.cancel")}
          </Button>
          <Button
            className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all ${
              !isValid ? "opacity-50 blur-[1px] pointer-events-none" : ""
            }`}
            onClick={handleSave}
            disabled={!isValid}
          >
            {t("talentPortal.content.irl.addBookOut.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
