import React from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LicenseTemplate } from "@/api/licenseTemplates";
import { useTranslation } from "react-i18next";

interface UseTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: LicenseTemplate | null;
  onSubmit: (clientName: string, clientEmail: string) => void;
  isLoading: boolean;
}

interface FormData {
  client_name: string;
  client_email: string;
}

export const UseTemplateModal: React.FC<UseTemplateModalProps> = ({
  isOpen,
  onClose,
  template,
  onSubmit,
  isLoading,
}) => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  // Reset form when modal opens/closes?
  // For simplicity, let's just render.

  const onFormSubmit = (data: FormData) => {
    onSubmit(data.client_name, data.client_email);
  };

  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {t("agencyDashboard.licenseTemplates.useModal.title", {
              defaultValue: "Use Contract: {{name}}",
              name: template.template_name,
            })}
          </DialogTitle>
          <DialogDescription>
            {t("agencyDashboard.licenseTemplates.useModal.description", {
              defaultValue:
                "Enter the client's information to create a new contract from this template.",
            })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="client_name">
              {t("agencyDashboard.licenseTemplates.useModal.clientName", {
                defaultValue: "Client Name",
              })}
            </Label>
            <Input
              id="client_name"
              placeholder={t(
                "agencyDashboard.licenseTemplates.useModal.clientNamePlaceholder",
                {
                  defaultValue: "e.g. Acme Corp",
                },
              )}
              {...register("client_name", {
                required: t(
                  "agencyDashboard.licenseTemplates.useModal.clientNameRequired",
                  {
                    defaultValue: "Client name is required",
                  },
                ),
              })}
            />
            {errors.client_name && (
              <p className="text-red-500 text-xs">
                {errors.client_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_email">
              {t("agencyDashboard.licenseTemplates.useModal.clientEmail", {
                defaultValue: "Client Email",
              })}
            </Label>
            <Input
              id="client_email"
              type="email"
              placeholder="client@example.com"
              {...register("client_email", {
                required: t(
                  "agencyDashboard.licenseTemplates.useModal.clientEmailRequired",
                  {
                    defaultValue: "Client email is required",
                  },
                ),
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: t(
                    "agencyDashboard.licenseTemplates.useModal.invalidEmail",
                    {
                      defaultValue: "Invalid email address",
                    },
                  ),
                },
              })}
            />
            {errors.client_email && (
              <p className="text-red-500 text-xs">
                {errors.client_email.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              disabled={isLoading}
            >
              {t("agencyDashboard.licenseTemplates.deleteModal.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-indigo-500 hover:bg-indigo-700"
              disabled={isLoading}
            >
              {isLoading
                ? t("agencyDashboard.catalogs.builder.actions.creating", {
                    defaultValue: "Creating…",
                  })
                : t("agencyDashboard.licenseTemplates.useModal.createAndSign", {
                    defaultValue: "Create & Sign",
                  })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
