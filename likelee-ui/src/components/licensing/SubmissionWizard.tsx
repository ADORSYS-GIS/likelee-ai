import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFriendlyErrorMessage } from "@/utils/errorUtils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LicenseTemplate, updateLicenseTemplate } from "@/api/licenseTemplates";
import {
    getLicenseSubmissions,
    createLicenseSubmissionDraft,
    finalizeLicenseSubmission,
} from "@/api/licenseSubmissions";
import { ContractEditor } from "./ContractEditor";
import { DocuSealBuilderModal } from "./DocuSealBuilderModal";
import { ArrowRight, ArrowLeft, Check, FileText, Layout } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface SubmissionWizardProps {
    isOpen: boolean;
    onClose: () => void;
    template: LicenseTemplate;
    onComplete: () => void;
}

const AVAILABLE_CONTRACT_VARIABLES = [
    "{client_name}",
    "{talent_name}",
    "{start_date}",
    "{template_name}",
    "{category}",
    "{description}",
    "{usage_scope}",
    "{duration_days}",
    "{territory}",
    "{exclusivity}",
    "{license_fee}",
    "{custom_terms}",
    "{modifications_allowed}",
];

interface FormData {
    client_name: string;
    talent_name: string;
    start_date: string;
    license_fee: number;
    duration_days: number;
    territory: string;
    exclusivity: string;
    modifications_allowed: string;
    custom_terms: string;
    contract_body: string;
    client_email: string; // Added for DocuSeal submission
}

const EXCLUSIVITY_OPTIONS = [
    "Non-exclusive",
    "Category exclusive",
    "Full exclusivity",
];

export const SubmissionWizard: React.FC<SubmissionWizardProps> = ({
    isOpen,
    onClose,
    template,
    onComplete,
}) => {
    const [step, setStep] = useState(1);
    const [isSyncing, setIsSyncing] = useState(false);
    const [draftId, setDraftId] = useState<string | null>(null);
    const [currentTemplate, setCurrentTemplate] =
        useState<LicenseTemplate>(template);
    const { toast } = useToast();

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        getValues,
        formState: { errors },
    } = useForm<FormData>({
        defaultValues: {
            client_name: "",
            talent_name: "",
            start_date: new Date().toISOString().split("T")[0],
            duration_days: template.duration_days || 90,
            territory: template.territory || "Worldwide",
            exclusivity: template.exclusivity || "Non-exclusive",
            modifications_allowed: template.modifications_allowed || "",
            license_fee: template.license_fee ? template.license_fee / 100 : 0,
            custom_terms: template.custom_terms || "",
            contract_body: template.contract_body || "",
            client_email: "", // Default for new field
        },
    });

    const formData = watch();

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            reset({
                client_name: "",
                talent_name: "",
                start_date: new Date().toISOString().split("T")[0],
                duration_days: template.duration_days || 90,
                territory: template.territory || "Worldwide",
                exclusivity: template.exclusivity || "Non-exclusive",
                modifications_allowed: template.modifications_allowed || "",
                license_fee: template.license_fee ? template.license_fee / 100 : 0,
                custom_terms: template.custom_terms || "",
                contract_body: template.contract_body || "",
                client_email: "", // Reset for new field
            });
        }
    }, [isOpen, template, reset]);

    const replacePlaceholders = (text: string, data: any) => {
        return text.replace(/{(\w+)}/g, (match, key) => {
            // Handle special formatting if needed
            if (key === "license_fee") return `$${data[key]}`;
            return data[key] || match;
        });
    };

    const handleNext = async () => {
        const currentData = getValues();
        if (step === 1) {
            // Validate step 1
            if (
                !currentData.client_name ||
                !currentData.talent_name ||
                !currentData.client_email
            ) {
                toast({
                    title: "Missing Information",
                    description: "Please fill in all required fields marked with *",
                    variant: "destructive",
                });
                return;
            }

            setIsSyncing(true);
            try {
                // 1. Create/Update draft in Likelee DB to persist client info early
                const draft = await createLicenseSubmissionDraft({
                    template_id: currentTemplate.id,
                    client_name: currentData.client_name,
                    client_email: currentData.client_email,
                    talent_names: currentData.talent_name,
                    license_fee: Math.round(currentData.license_fee * 100),
                    duration_days: currentData.duration_days,
                    start_date: currentData.start_date,
                    custom_terms: currentData.custom_terms,
                    docuseal_template_id: currentTemplate.docuseal_template_id,
                });

                if (draft?.id) {
                    setDraftId(draft.id);
                }

                // 2. Prepare the rendered contract for Step 2
                const rendered = replacePlaceholders(
                    currentTemplate.contract_body || "",
                    {
                        ...currentData,
                        template_name: currentTemplate.template_name,
                        category: currentTemplate.category,
                        description: currentTemplate.description,
                        usage_scope: currentTemplate.usage_scope,
                    },
                );
                setValue("contract_body", rendered);
                setStep(2);
            } catch (err: any) {
                toast({
                    title: "Preparation Failed",
                    description: getFriendlyErrorMessage(err),
                    variant: "destructive",
                });
            } finally {
                setIsSyncing(false);
            }
        } else if (step === 2) {
            // Transition to Step 3: DocuSeal Sync
            handleSyncToDocuSeal();
        }
    };

    const handleSyncToDocuSeal = async () => {
        setIsSyncing(true);
        // const currentData = getValues();
        try {
            // NOTE: We do NOT update the template here.
            // We pass the customized contract_body directly to the DocuSeal builder token generator.
            // This prevents overwriting the master template placeholders.

            // const updated = await updateLicenseTemplate(currentTemplate.id, {
            //   ...currentTemplate,
            //   contract_body: currentData.contract_body,
            //   ...
            // } as any);
            // setCurrentTemplate(updated);

            setStep(3);
        } catch (err: any) {
            toast({
                title: "Sync Failed",
                description: getFriendlyErrorMessage(err),
                variant: "destructive",
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleFinalSend = async () => {
        setIsSyncing(true);
        const currentData = getValues();
        try {
            // Step 1: Create draft if not already created
            let submissionId = draftId;
            if (!submissionId) {
                const draft = await createLicenseSubmissionDraft({
                    template_id: currentTemplate.id,
                    client_name: currentData.client_name,
                    client_email: currentData.client_email,
                    talent_names: currentData.talent_name,
                    license_fee: Math.round(currentData.license_fee * 100),
                    duration_days: currentData.duration_days,
                    start_date: currentData.start_date,
                    custom_terms: currentData.custom_terms,
                    docuseal_template_id: currentTemplate.docuseal_template_id,
                });
                submissionId = draft?.id;
                if (!submissionId) {
                    throw new Error("Draft creation returned no ID");
                }
                setDraftId(submissionId);
            }

            // Step 2: Finalize the submission (this creates the licensing_request)
            await finalizeLicenseSubmission(submissionId, {
                docuseal_template_id: currentTemplate.docuseal_template_id,
                client_name: currentData.client_name,
                client_email: currentData.client_email,
                talent_names: currentData.talent_name,
            });

            toast({
                title: "Success",
                description: "License sent and recorded successfully.",
            });

            onComplete();
            onClose();
        } catch (err: any) {
            toast({
                title: "Send Failed",
                description: getFriendlyErrorMessage(err),
                variant: "destructive",
            });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent
                className={`max-w-5xl h-[92vh] p-0 border-none bg-slate-50 rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 ${step === 3 ? "translate-y-full opacity-0 pointer-events-none" : ""}`}
            >
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Wizard Header / Progress */}
                    <div className="bg-white p-8 border-b border-slate-100 rounded-t-3xl shrink-0">
                        <div className="flex items-center justify-between gap-8 mb-8">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="bg-indigo-50 p-1.5 rounded-lg">
                                        <FileText className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                                        Step {step} of 3
                                    </span>
                                </div>
                                <DialogTitle className="text-2xl font-bold text-slate-900">
                                    {step === 1 ? "Deal Specifics" : "Content Review"}
                                </DialogTitle>
                                <p className="text-sm text-slate-500 font-medium">
                                    {step === 1
                                        ? "Enter the core details of this licensing deal"
                                        : "Review and personalize the contract content"}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    className="rounded-xl font-bold text-slate-500 px-6 h-10"
                                >
                                    Cancel
                                </Button>
                                {step > 1 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setStep(step - 1)}
                                        className="rounded-xl font-bold border-slate-200 h-10"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                    </Button>
                                )}
                                <Button
                                    onClick={handleNext}
                                    disabled={isSyncing}
                                    className="bg-indigo-500 hover:bg-indigo-500 text-white font-bold h-10 px-8 rounded-xl shadow-lg shadow-indigo-100/50 transition-all active:scale-95"
                                >
                                    {isSyncing
                                        ? "Preparing..."
                                        : step === 3
                                            ? "Finalize"
                                            : "Next Step"}
                                    {!isSyncing && step < 3 && (
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-4 px-1">
                            {[1, 2, 3].map((s) => (
                                <div key={s} className="flex-1 flex items-center gap-3">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${step === s
                                                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200 scale-110"
                                                : step > s
                                                    ? "bg-green-500 text-white"
                                                    : "bg-slate-100 text-slate-400"
                                            }`}
                                    >
                                        {step > s ? <Check className="w-4 h-4" /> : s}
                                    </div>
                                    <div
                                        className={`flex-1 h-1.5 rounded-full transition-all ${step >= s ? "bg-indigo-500/10" : "bg-slate-100"}`}
                                    >
                                        <div
                                            className={`h-full bg-indigo-500 rounded-full transition-all duration-500 ${step === s ? "w-1/2" : step > s ? "w-full" : "w-0"}`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                        {step === 1 && (
                            <div className="max-w-3xl mx-auto space-y-8 pb-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="p-8 bg-white rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <h3 className="font-bold text-slate-900">
                                                Identification
                                            </h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold text-slate-800 ml-1">
                                                    Brand Name *
                                                </Label>
                                                <Input
                                                    {...register("client_name", { required: true })}
                                                    placeholder="e.g. Nike, Spotify"
                                                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium focus:ring-4 focus:ring-indigo-50 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold text-slate-800 ml-1">
                                                    Talent Name *
                                                </Label>
                                                <Input
                                                    {...register("talent_name", { required: true })}
                                                    placeholder="e.g. Talent A"
                                                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium focus:ring-4 focus:ring-indigo-50 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold text-slate-800 ml-1">
                                                    Client Email *
                                                </Label>
                                                <Input
                                                    type="email"
                                                    {...register("client_email", { required: true })}
                                                    placeholder="client@example.com"
                                                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium focus:ring-4 focus:ring-indigo-50 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold text-slate-800 ml-1">
                                                    Start Date
                                                </Label>
                                                <Input
                                                    type="date"
                                                    {...register("start_date")}
                                                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-white rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center">
                                                <Layout className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <h3 className="font-bold text-slate-900">Commercials</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-bold text-slate-800 ml-1">
                                                        Duration (days)
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        {...register("duration_days", {
                                                            valueAsNumber: true,
                                                        })}
                                                        className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-bold text-slate-800 ml-1">
                                                        Territory
                                                    </Label>
                                                    <Input
                                                        {...register("territory")}
                                                        className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold text-slate-800 ml-1">
                                                    Exclusivity
                                                </Label>
                                                <Select
                                                    value={formData.exclusivity}
                                                    onValueChange={(val) => setValue("exclusivity", val)}
                                                >
                                                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200">
                                                        {EXCLUSIVITY_OPTIONS.map((opt) => (
                                                            <SelectItem
                                                                key={opt}
                                                                value={opt}
                                                                className="font-medium rounded-lg"
                                                            >
                                                                {opt}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold text-slate-800 ml-1">
                                                    Modifications Allowed
                                                </Label>
                                                <Input
                                                    {...register("modifications_allowed")}
                                                    placeholder="e.g. Yes, with approval"
                                                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold text-slate-800 ml-1">
                                                    License Fee ($)
                                                </Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...register("license_fee", { valueAsNumber: true })}
                                                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-white rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
                                    <Label className="text-sm font-bold text-slate-800 ml-1">
                                        Additional Custom Terms
                                    </Label>
                                    <Textarea
                                        {...register("custom_terms")}
                                        placeholder="Describe any other conditions for this specific deal..."
                                        className="min-h-[120px] bg-slate-50 border-slate-200 rounded-2xl font-medium p-6"
                                    />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="max-w-4xl mx-auto pb-10">
                                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-8">
                                    <ContractEditor
                                        body={formData.contract_body}
                                        format={
                                            (template.contract_body_format as any) || "markdown"
                                        }
                                        onChangeBody={(val) => setValue("contract_body", val)}
                                        onChangeFormat={() => { }} // Format locked in submission
                                        variables={AVAILABLE_CONTRACT_VARIABLES}
                                        placeholder="The contract content will appear here..."
                                    />
                                </div>
                                <div className="mt-8 p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-4">
                                    <div className="bg-indigo-500 p-2 rounded-xl mt-1">
                                        <FileText className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-indigo-900 mb-1">
                                            Pre-filled Data Applied
                                        </h4>
                                        <p className="text-sm text-indigo-800/80 leading-relaxed font-medium">
                                            We've automatically replaced all placeholders with your
                                            deal specifics. You can still make quick edits directly in
                                            the editor before finalizing.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>

            {/* Step 3: DocuSeal Embedded Builder */}
            {step === 3 && (
                <DocuSealBuilderModal
                    open={step === 3}
                    onClose={() => setStep(2)}
                    templateName={currentTemplate.template_name}
                    docusealTemplateId={currentTemplate.docuseal_template_id}
                    externalId={`temp-${currentTemplate.id}-${Date.now()}`}
                    contractBody={formData.contract_body} // Pass the deal-specific body!
                    onSend={handleFinalSend}
                    isSending={isSyncing}
                    onSave={() => {
                        // Keep open, wait for Final Send
                    }}
                />
            )}
        </Dialog>
    );
};
