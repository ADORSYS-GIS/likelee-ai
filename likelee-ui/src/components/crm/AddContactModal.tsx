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
import { useTranslation } from "react-i18next";

const AddContactModal = ({
  clientId,
  isOpen,
  onClose,
}: {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { t } = useTranslation("agency");
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
      toast({
        title: t("agencyDashboard.clientCRM.toasts.successTitle"),
        description: t(
          "agencyDashboard.clientCRM.modal.profile.addContact.toasts.created",
        ),
      });
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
        title: t("agencyDashboard.clientCRM.toasts.errorTitle"),
        description:
          parseBackendError(error) ||
          t("agencyDashboard.clientCRM.modal.profile.addContact.toasts.failed"),
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {t("agencyDashboard.clientCRM.modal.profile.addContact.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="font-bold">
              {t("agencyDashboard.clientCRM.modal.profile.addContact.fullName")}
            </Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={t(
                "agencyDashboard.clientCRM.modal.profile.addContact.placeholders.fullName",
              )}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">
              {t("agencyDashboard.clientCRM.modal.profile.addContact.role")}
            </Label>
            <Input
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              placeholder={t(
                "agencyDashboard.clientCRM.modal.profile.addContact.placeholders.role",
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold">
                {t("agencyDashboard.clientCRM.modal.profile.addContact.email")}
              </Label>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">
                {t("agencyDashboard.clientCRM.modal.profile.addContact.phone")}
              </Label>
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
              {t("agencyDashboard.clientCRM.modal.profile.addContact.primary")}
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("agencyDashboard.clientCRM.actions.cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate(formData)}
            disabled={mutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {mutation.isPending
              ? t("agencyDashboard.clientCRM.modal.addClient.actions.adding")
              : t("agencyDashboard.clientCRM.modal.profile.actions.addContact")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddContactModal;
