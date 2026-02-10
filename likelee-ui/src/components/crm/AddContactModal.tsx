import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { parseBackendError } from "@/utils/errorParser";
import * as crmApi from "@/api/crm";

const AddContactModal = ({
  clientId,
  isOpen,
  onClose,
}: {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    is_primary: false,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => crmApi.createContact(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["client-contacts", clientId],
      });
      toast({ title: "Success", description: "Contact added successfully" });
      onClose();
      setFormData({
        name: "",
        role: "",
        email: "",
        phone: "",
        is_primary: false,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: parseBackendError(error) || "Failed to add contact",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="font-bold">Full Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Role</Label>
            <Input
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              placeholder="Casting Director"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold">Email</Label>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+1..."
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_primary"
              checked={formData.is_primary}
              onCheckedChange={(val) =>
                setFormData({ ...formData, is_primary: !!val })
              }
            />
            <Label htmlFor="is_primary" className="font-bold">
              Primary Contact
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate(formData)}
            disabled={mutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {mutation.isPending ? "Adding..." : "Add Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddContactModal;
