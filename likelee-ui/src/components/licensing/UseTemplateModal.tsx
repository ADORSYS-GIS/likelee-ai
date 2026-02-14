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
          <DialogTitle>Use Template: {template.template_name}</DialogTitle>
          <DialogDescription>
            Enter the client's information to create a new contract from this
            template.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="client_name">Client Name</Label>
            <Input
              id="client_name"
              placeholder="e.g. Acme Corp"
              {...register("client_name", {
                required: "Client name is required",
              })}
            />
            {errors.client_name && (
              <p className="text-red-500 text-xs">
                {errors.client_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_email">Client Email</Label>
            <Input
              id="client_email"
              type="email"
              placeholder="client@example.com"
              {...register("client_email", {
                required: "Client email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
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
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-500 hover:bg-indigo-700"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create & Sign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
