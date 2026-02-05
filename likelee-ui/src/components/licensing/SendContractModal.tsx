import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createAndSendLicenseSubmission } from "@/api/licenseSubmissions";
import { getLicenseTemplates, LicenseTemplate } from "@/api/licenseTemplates";
import { useToast } from "@/components/ui/use-toast";

interface SendContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    templateId: string; // From LicenseTemplate
    docusealTemplateId: number;
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
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

    // Fetch the template to get default values
    const { data: templates } = useQuery({
        queryKey: ["license-templates"],
        queryFn: getLicenseTemplates,
    });

    const template = templates?.find(t => t.id === templateId);

    const finalizeMutation = useMutation({
        mutationFn: async (data: FormData) => {
            return createAndSendLicenseSubmission({
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

    const onSubmit = (data: FormData) => {
        finalizeMutation.mutate(data);
    };

    return (
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
    );
};
