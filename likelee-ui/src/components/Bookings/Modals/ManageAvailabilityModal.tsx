import React from "react";
import { Plus, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const ManageAvailabilityModal = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
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
        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold mb-8 rounded-lg h-10">
          <Plus className="w-4 h-4 mr-2" /> Add Book-Out
        </Button>
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
      </div>
    </DialogContent>
  </Dialog>
);
