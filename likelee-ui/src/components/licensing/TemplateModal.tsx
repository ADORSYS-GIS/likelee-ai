import React, { useEffect } from "react";
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
            duration_days: 30, // Default duration
        },
    });

    useEffect(() => {
        if (isOpen) {
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
                    pricing_range_min_cents: initialData.pricing_range_min_cents,
                    pricing_range_max_cents: initialData.pricing_range_max_cents,
                    additional_terms: initialData.additional_terms,
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
                    pricing_range_min_cents: undefined,
                    pricing_range_max_cents: undefined,
                    additional_terms: "",
                });
            }
        }
    }, [isOpen, initialData, reset]);

    // Hook for Select components
    const categoryValue = watch("category");
    const exclusivityValue = watch("exclusivity");

    const onSubmit = async (data: CreateTemplateRequest) => {
        await onSave(data);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {initialData ? "Edit Template" : "New Template"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                            {/* Hidden input for validation if needed, or rely on Select state */}
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

                    <div className="space-y-2">
                        <Label htmlFor="modifications_allowed">Modifications Allowed</Label>
                        <Textarea
                            id="modifications_allowed"
                            {...register("modifications_allowed")}
                            placeholder="e.g. Minor edits allowed..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Pricing Range (Min - Max Cents)</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Min"
                                    type="number"
                                    {...register("pricing_range_min_cents", { valueAsNumber: true })}
                                />
                                <Input
                                    placeholder="Max"
                                    type="number"
                                    {...register("pricing_range_max_cents", { valueAsNumber: true })}
                                />
                            </div>
                            <p className="text-xs text-gray-500">Enter amounts in cents (e.g. 1000 = $10.00)</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="additional_terms">Additional Terms</Label>
                        <Textarea
                            id="additional_terms"
                            {...register("additional_terms")}
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
