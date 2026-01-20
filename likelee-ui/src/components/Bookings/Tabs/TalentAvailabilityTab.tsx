import React, { useState } from "react";
import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { TALENT_DATA } from "@/data/mockData";
import { AddBookOutModal } from "../Modals/AddBookOutModal";

export const TalentAvailabilityTab = ({
  bookOuts = [],
  onAddBookOut,
  onRemoveBookOut,
}: {
  bookOuts?: any[];
  onAddBookOut: (bookOut: any) => void;
  onRemoveBookOut: (id: string) => void;
}) => {
  const [addBookOutOpen, setAddBookOutOpen] = useState(false);
  const { toast, dismiss } = useToast();

  // Helper to find talent name
  const getTalentName = (id: string) =>
    TALENT_DATA.find((t) => t.id === id)?.name || "Unknown Talent";

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
          {bookOuts.map((bo) => (
            <Card
              key={bo.id}
              className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#FFF9F5] border-orange-200"
            >
              <div className="flex flex-col gap-1">
                <h4 className="font-bold text-gray-900 text-lg">
                  {getTalentName(bo.talentId)}
                </h4>
                <p className="text-sm text-gray-500 font-medium mb-2">
                  {new Date(bo.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(bo.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-orange-100 text-orange-800 capitalize">
                    {bo.reason.replace("_", " ")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 font-bold px-4"
                  onClick={() => {
                    toast({
                      title: "Delete Book-Out?",
                      description: "This action cannot be undone.",
                      action: (
                        <ToastAction
                          altText="Delete"
                          onClick={() => {
                            onRemoveBookOut(bo.id);
                            dismiss();
                          }}
                          className="font-bold bg-red-600 text-white hover:bg-red-700 hover:text-white border-none"
                        >
                          Delete
                        </ToastAction>
                      ),
                    });
                  }}
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))}
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
