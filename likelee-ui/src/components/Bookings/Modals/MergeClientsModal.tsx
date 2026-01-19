import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export const MergeClientsModal = ({
  open,
  onOpenChange,
  clients,
  onMerge,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: any[];
  onMerge: (sourceId: string, targetId: string) => void;
}) => {
  const { toast } = useToast();
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");

  const sourceClient = clients.find((c) => c.id === sourceId);
  const targetClient = clients.find((c) => c.id === targetId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Merge Duplicate Clients
          </DialogTitle>
          <DialogDescription>
            Select two clients to merge. All bookings from the source will be
            moved to the target.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="font-bold">Source Client (will be deleted)</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client to merge from" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company} ({c.bookings_count || 0} bookings)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-bold">
              Target Client (will keep all data)
            </Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client to merge into" />
              </SelectTrigger>
              <SelectContent>
                {clients
                  .filter((c) => c.id !== sourceId)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company} ({c.bookings_count || 0} bookings)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {sourceId && targetId && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 mt-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                <span className="font-bold">Warning:</span> This will move{" "}
                {sourceClient?.bookings_count || 0} booking(s) from "
                {sourceClient?.company}" to "{targetClient?.company}" and delete
                the source client. This action cannot be undone.
              </p>
            </div>
          )}
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
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            disabled={!sourceId || !targetId || sourceId === targetId}
            onClick={() => {
              onMerge(sourceId, targetId);
              onOpenChange(false);
              toast({
                title: "Clients Merged",
                description: `Successfully merged ${sourceClient?.company} into ${targetClient?.company}`,
              });
            }}
          >
            Merge Clients
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
