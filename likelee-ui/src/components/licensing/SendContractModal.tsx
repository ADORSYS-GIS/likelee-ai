import React, { useEffect, useState } from "react";
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
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  createLicenseSubmissionDraft,
  finalizeLicenseSubmission,
  previewLicenseSubmission,
  syncLicenseSubmissionStatus,
} from "@/api/licenseSubmissions";
import { getLicenseTemplates, LicenseTemplate } from "@/api/licenseTemplates";
import { useToast } from "@/components/ui/use-toast";
import { DocusealForm } from "@docuseal/react";
import { Switch } from "@/components/ui/switch";
import { getUserFriendlyError } from "@/utils/error-utils";

interface SendContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string; // From LicenseTemplate
  docusealTemplateId?: number;
  licenseFee?: number; // Optional overrides
  initialValues?: Partial<FormData>;
  onSuccess?: () => void;
}

interface FormData {
  client_name: string;
  client_email: string;
  talent_names?: string;
}

export const SendContractModal: React.FC<SendContractModalProps> = ({
  isOpen,
  onClose,
  templateId,
  docusealTemplateId,
  licenseFee,
  initialValues,
  onSuccess,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>();

  const [draftId, setDraftId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [requiresAgencySignature, setRequiresAgencySignature] = useState(false);
  const [agencySignOpen, setAgencySignOpen] = useState(false);
  const [agencySignUrl, setAgencySignUrl] = useState<string | null>(null);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(
    null,
  );

  // Fetch the template to get default values
  const { data: templates } = useQuery({
    queryKey: ["license-templates"],
    queryFn: getLicenseTemplates,
  });

  const template = templates?.find((t) => t.id === templateId);

  useEffect(() => {
    if (!isOpen) return;
    if (!template) return;

    if (template.client_name) {
      setValue("client_name", template.client_name);
    }

    if (template.talent_name) {
      setValue("talent_names", template.talent_name);
    }

    if (initialValues?.client_name) {
      setValue("client_name", initialValues.client_name);
    }
    if (initialValues?.client_email) {
      setValue("client_email", initialValues.client_email);
    }
    if (initialValues?.talent_names) {
      setValue("talent_names", initialValues.talent_names);
    }
  }, [isOpen, template, initialValues, setValue]);

  useEffect(() => {
    if (!isOpen) {
      setDraftId(null);
      setPreviewUrl(null);
      setPreviewOpen(false);
      setRequiresAgencySignature(false);
      setAgencySignOpen(false);
      setAgencySignUrl(null);
      setCurrentSubmissionId(null);
    }
  }, [isOpen]);

  const draftMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return createLicenseSubmissionDraft({
        template_id: templateId,
        docuseal_template_id: docusealTemplateId,
        client_name: data.client_name,
        client_email: data.client_email,
        talent_names: data.talent_names || template?.talent_name,
        license_fee: licenseFee || template?.license_fee,
        duration_days: template?.duration_days,
        start_date: template?.start_date,
        custom_terms: template?.custom_terms,
        requires_agency_signature: requiresAgencySignature,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Draft Failed",
        description:
          getUserFriendlyError(error) ||
          "We couldn't prepare this contract draft. Please try again.",
        variant: "destructive",
      });
    },
  });

  const previewMutation = useMutation({
    mutationFn: async (args: { id: string; data: FormData }) => {
      return previewLicenseSubmission(args.id, {
        docuseal_template_id: docusealTemplateId,
        client_name: args.data.client_name,
        client_email: args.data.client_email,
        talent_names: args.data.talent_names || template?.talent_name,
        license_fee: licenseFee || template?.license_fee,
        duration_days: template?.duration_days,
        start_date: template?.start_date,
        custom_terms: template?.custom_terms,
        requires_agency_signature: requiresAgencySignature,
      });
    },
    onSuccess: (res) => {
      setPreviewUrl(res.preview_url);
      setPreviewOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Preview Failed",
        description:
          getUserFriendlyError(error) ||
          "We couldn't load the preview right now. Please try again.",
        variant: "destructive",
      });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (data: FormData) => {
      let id = draftId;

      if (!id) {
        const draft = await draftMutation.mutateAsync(data);
        id = draft?.id;
        if (!id) {
          throw new Error("Draft creation returned no id");
        }
        setDraftId(id);
      }

      return finalizeLicenseSubmission(id, {
        docuseal_template_id: docusealTemplateId,
        client_name: data.client_name,
        client_email: data.client_email,
        talent_names: data.talent_names || template?.talent_name,
        requires_agency_signature: requiresAgencySignature,
      });
    },
    onSuccess: (res) => {
      setCurrentSubmissionId((res as any)?.id || null);
      queryClient.invalidateQueries({ queryKey: ["license-submissions"] });
      const embedUrl =
        (res as any)?.agency_embed_src ||
        ((res as any)?.agency_submitter_slug
          ? `https://docuseal.co/s/${(res as any).agency_submitter_slug}`
          : (res as any)?.docuseal_slug
            ? `https://docuseal.co/s/${(res as any).docuseal_slug}`
            : null);
      if (requiresAgencySignature && embedUrl) {
        setAgencySignUrl(embedUrl);
        setAgencySignOpen(true);
        toast({
          title: "Agency signature required",
          description:
            "Please complete your signature now. Client will receive it after you sign.",
        });
      } else {
        toast({
          title: "Contract Sent!",
          description: "The contract has been emailed to the client.",
        });
        if (onSuccess) onSuccess();
        onClose();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Sending Failed",
        description:
          getUserFriendlyError(error) ||
          "We couldn't send the contract right now. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onPreview = handleSubmit(async (data: FormData) => {
    let id = draftId;

    if (!id) {
      const draft = await draftMutation.mutateAsync(data);
      id = draft?.id;
      if (!id) {
        throw new Error("Draft creation returned no id");
      }
      setDraftId(id);
    }

    previewMutation.mutate({ id, data });
  });

  const onSubmit = (data: FormData) => {
    finalizeMutation.mutate(data);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Send Contract</DialogTitle>
            <DialogDescription>
              Enter the recipient's details to send the contract for signature.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
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

            <div className="space-y-2">
              <Label htmlFor="talent_names">Talent Name (Optional)</Label>
              <Input
                id="talent_names"
                placeholder={template?.talent_name || "e.g. John Doe"}
                {...register("talent_names")}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use template default:{" "}
                {template?.talent_name || "N/A"}
              </p>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="requiresAgencySignature">
                  Agency signs first (on platform)
                </Label>
                <Switch
                  id="requiresAgencySignature"
                  checked={requiresAgencySignature}
                  onCheckedChange={setRequiresAgencySignature}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, the client receives the signing request only after
                the agency signs.
              </p>
            </div>

            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={onPreview}
                disabled={
                  finalizeMutation.isPending ||
                  draftMutation.isPending ||
                  previewMutation.isPending
                }
              >
                {previewMutation.isPending || draftMutation.isPending
                  ? "Loading Preview..."
                  : "Preview"}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={onClose}
                disabled={finalizeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-500 hover:bg-indigo-700"
                disabled={finalizeMutation.isPending}
              >
                {finalizeMutation.isPending ? "Sending..." : "Send Now"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={previewOpen}
        onOpenChange={(v) => !v && setPreviewOpen(false)}
      >
        <DialogContent className="fixed !inset-0 bg-background w-screen h-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none border-none p-0 flex flex-col outline-none">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Contract Preview</DialogTitle>
            <DialogDescription>
              Review the prefilled submission preview before sending.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 w-full bg-gray-50 overflow-auto">
            {previewUrl ? <DocusealForm src={previewUrl} /> : null}
          </div>

          <DialogFooter className="p-4 border-t">
            <Button
              variant="outline"
              type="button"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={agencySignOpen}
        onOpenChange={(v) => {
          if (!v) {
            setAgencySignOpen(false);
            if (onSuccess) onSuccess();
            onClose();
          }
        }}
      >
        <DialogContent className="fixed !inset-0 bg-background w-screen h-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none border-none p-0 flex flex-col outline-none">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Agency Signature</DialogTitle>
            <DialogDescription>
              Complete your signature to release this contract to the client.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full bg-gray-50 overflow-auto">
            {agencySignUrl ? <DocusealForm src={agencySignUrl} /> : null}
          </div>
          <DialogFooter className="p-4 border-t">
            <Button
              variant="outline"
              type="button"
              onClick={async () => {
                if (currentSubmissionId) {
                  try {
                    await syncLicenseSubmissionStatus(currentSubmissionId);
                    await queryClient.invalidateQueries({
                      queryKey: ["license-submissions"],
                    });
                  } catch {
                    // ignore transient sync issues
                  }
                }
                setAgencySignOpen(false);
                if (onSuccess) onSuccess();
                onClose();
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
