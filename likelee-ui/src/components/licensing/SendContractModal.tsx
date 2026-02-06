import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createLicenseSubmissionDraft, finalizeLicenseSubmission, previewLicenseSubmission } from "@/api/licenseSubmissions";
import { getLicenseTemplates, LicenseTemplate } from "@/api/licenseTemplates";
import { useToast } from "@/components/ui/use-toast";
import { DocusealForm } from "@docuseal/react";

interface SendContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    templateId: string; // From LicenseTemplate
    docusealTemplateId?: number;
    licenseFee?: number; // Optional overrides
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
    onSuccess
}) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>();

    const [draftId, setDraftId] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    // Fetch the template to get default values
    const { data: templates } = useQuery({
        queryKey: ["license-templates"],
        queryFn: getLicenseTemplates,
    });

    const template = templates?.find(t => t.id === templateId);

    useEffect(() => {
        if (!isOpen) return;
        if (!template) return;

        if (template.client_name) {
            setValue("client_name", template.client_name);
        }

        if (template.talent_name) {
            setValue("talent_names", template.talent_name);
        }
    }, [isOpen, template, setValue]);

    useEffect(() => {
        if (!isOpen) {
            setDraftId(null);
            setPreviewUrl(null);
            setPreviewOpen(false);
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
            });
        },
        onError: (error: any) => {
            toast({
                title: "Draft Failed",
                description: error.message || "Could not create a draft submission.",
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
            });
        },
        onSuccess: (res) => {
            setPreviewUrl(res.preview_url);
            setPreviewOpen(true);
        },
        onError: (error: any) => {
            toast({
                title: "Preview Failed",
                description: error.message || "Could not load preview.",
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
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["license-submissions"] });
            toast({
                title: "Contract Sent!",
                description: "The contract has been emailed to the client.",
            });
            if (onSuccess) onSuccess();
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: "Sending Failed",
                description: error.message || "Could not send the contract.",
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
                                {...register("client_name", { required: "Client name is required" })}
                            />
                            {errors.client_name && <p className="text-red-500 text-xs">{errors.client_name.message}</p>}
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
                                        message: "Invalid email address"
                                    }
                                })}
                            />
                            {errors.client_email && <p className="text-red-500 text-xs">{errors.client_email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="talent_names">Talent Name (Optional)</Label>
                            <Input
                                id="talent_names"
                                placeholder={template?.talent_name || "e.g. John Doe"}
                                {...register("talent_names")}
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave blank to use template default: {template?.talent_name || "N/A"}
                            </p>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={onPreview}
                                disabled={finalizeMutation.isPending || draftMutation.isPending || previewMutation.isPending}
                            >
                                {previewMutation.isPending || draftMutation.isPending ? "Loading Preview..." : "Preview"}
                            </Button>
                            <Button variant="outline" type="button" onClick={onClose} disabled={finalizeMutation.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={finalizeMutation.isPending}>
                                {finalizeMutation.isPending ? "Sending..." : "Send Now"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={previewOpen} onOpenChange={(v) => !v && setPreviewOpen(false)}>
                <DialogContent className="fixed !inset-0 bg-background w-screen h-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none border-none p-0 flex flex-col outline-none">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle>Contract Preview</DialogTitle>
                        <DialogDescription>Review the prefilled submission preview before sending.</DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 w-full bg-gray-50 overflow-auto">
                        {previewUrl ? (
                            <DocusealForm src={previewUrl} />
                        ) : null}
                    </div>

                    <DialogFooter className="p-4 border-t">
                        <Button variant="outline" type="button" onClick={() => setPreviewOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
