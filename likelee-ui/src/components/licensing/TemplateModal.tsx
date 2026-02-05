import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CreateTemplateRequest, LicenseTemplate } from "@/api/licenseTemplates";

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CreateTemplateRequest) => Promise<void>;
    initialData?: LicenseTemplate | null;
}

const CATEGORIES = [
    "Social Media",
    "E-commerce",
    "Advertising",
    "Editorial",
    "Film & TV",
    "Custom",
];

const EXCLUSIVITY_OPTIONS = [
    "Non-exclusive",
    "Category exclusive",
    "Full exclusivity",
];

export const TemplateModal: React.FC<TemplateModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<CreateTemplateRequest>({
        defaultValues: {
            template_name: "",
            category: "",
            exclusivity: "",
            duration_days: 30,
            client_name: "",
            talent_name: "",
            start_date: "",
        },
    });

    useEffect(() => {
        if (isOpen) {
            setSelectedFile(null); // Reset file on open
            if (initialData) {
                reset({
                    template_name: initialData.template_name,
                    category: initialData.category,
                    description: initialData.description,
                    usage_scope: initialData.usage_scope,
                    duration_days: initialData.duration_days,
                    territory: initialData.territory,
                    exclusivity: initialData.exclusivity,
                    modifications_allowed: initialData.modifications_allowed,
                    license_fee: initialData.license_fee ? initialData.license_fee / 100 : undefined,
                    custom_terms: initialData.custom_terms,
                    docuseal_template_id: initialData.docuseal_template_id,
                    client_name: initialData.client_name,
                    talent_name: initialData.talent_name,
                    start_date: initialData.start_date,
                });
            } else {
                reset({
                    template_name: "",
                    category: "",
                    description: "",
                    usage_scope: "",
                    duration_days: 90,
                    territory: "Worldwide",
                    exclusivity: "",
                    modifications_allowed: "",
                    license_fee: undefined,
                    custom_terms: "",
                    docuseal_template_id: undefined,
                    client_name: "",
                    talent_name: "",
                    start_date: "",
                });
            }
        }
    }, [isOpen, initialData, reset]);

    const categoryValue = watch("category");
    const exclusivityValue = watch("exclusivity");

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result?.toString().split(",")[1];
                resolve(base64 || "");
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const onSubmit = async (data: CreateTemplateRequest) => {
        let document_base64 = undefined;
        try {
            if (selectedFile) {
                document_base64 = await fileToBase64(selectedFile);
            }
        } catch (err) {
            console.error("File to base64 conversion failed:", err);
        }

        // Convert dollars back to cents for API
        const payload = {
            ...data,
            license_fee: data.license_fee ? Math.round(data.license_fee * 100) : undefined,
            // Ensure empty docuseal_template_id is undefined, not ""
            docuseal_template_id: data.docuseal_template_id || undefined,
            document_base64,
        };
        await onSave(payload);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-4">
                    <DialogTitle>
                        {initialData ? "Edit Template" : "New Template"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 space-y-4">
                        <h3 className="text-sm font-semibold text-blue-900 border-b border-blue-100 pb-2">Deal Specifics</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="client_name">Client/Brand Name</Label>
                                <Input
                                    id="client_name"
                                    {...register("client_name")}
                                    placeholder="Enter client name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="talent_name">Talent Name (comma-separated)</Label>
                                <Input
                                    id="talent_name"
                                    {...register("talent_name")}
                                    placeholder="e.g. Talent A, Talent B"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Start Date</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    {...register("start_date")}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="template_name">Template Name *</Label>
                            <Input
                                id="template_name"
                                {...register("template_name", { required: true })}
                                placeholder="e.g. Standard Social Media"
                            />
                            {errors.template_name && (
                                <span className="text-red-500 text-sm">Required</span>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category *</Label>
                            <Select
                                value={categoryValue}
                                onValueChange={(val) => setValue("category", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            {...register("description")}
                            placeholder="Description of the template..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="usage_scope">Usage Scope</Label>
                        <Input
                            id="usage_scope"
                            {...register("usage_scope")}
                            placeholder="e.g. Organic Social Media"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="duration_days">Duration (days)</Label>
                            <Input
                                id="duration_days"
                                type="number"
                                {...register("duration_days", { valueAsNumber: true })}
                                placeholder="e.g. 90"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="territory">Territory</Label>
                            <Input
                                id="territory"
                                {...register("territory")}
                                placeholder="e.g. North America"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="exclusivity">Exclusivity *</Label>
                        <Select
                            value={exclusivityValue}
                            onValueChange={(val) => setValue("exclusivity", val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select exclusivity" />
                            </SelectTrigger>
                            <SelectContent>
                                {EXCLUSIVITY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt} value={opt}>
                                        {opt}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="license_fee">License Fee ($)</Label>
                            <Input
                                id="license_fee"
                                placeholder="Amount ($)"
                                type="number"
                                step="0.01"
                                {...register("license_fee", { valueAsNumber: true })}
                            />
                            <p className="text-xs text-gray-500">Enter amount in dollars (e.g. 10.00)</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="custom_terms">Custom Terms</Label>
                        <Textarea
                            id="custom_terms"
                            {...register("custom_terms")}
                            placeholder="Any extra conditions..."
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {initialData ? "Update Template" : "Create Template"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
