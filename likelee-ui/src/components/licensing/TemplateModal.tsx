import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CreateTemplateRequest, LicenseTemplate } from "@/api/licenseTemplates";
import { ContractEditor } from "./ContractEditor";
import { Sparkles } from "lucide-react";

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateTemplateRequest) => Promise<void>;
  initialData?: LicenseTemplate | null;
  hideContract?: boolean;
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

const CATEGORIES = [
  "Social Media",
  "E-commerce",
  "Advertising",
  "Editorial",
  "Film & TV",
  "Custom",
];

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  hideContract,
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
      contract_body_format: "markdown",
      contract_body: "",
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
          license_fee: initialData.license_fee
            ? initialData.license_fee / 100
            : undefined,
          custom_terms: initialData.custom_terms,
          docuseal_template_id: initialData.docuseal_template_id,
          contract_body: initialData.contract_body,
          contract_body_format: (initialData.contract_body_format as any) || "markdown",
        });
      } else {
        reset({
          template_name: "",
          category: "",
          description: "",
          usage_scope: "",
          duration_days: 90,
          territory: "Worldwide",
          exclusivity: "Non-exclusive",
          modifications_allowed: "",
          license_fee: undefined,
          custom_terms: "",
          docuseal_template_id: undefined,
          contract_body: "",
          contract_body_format: "markdown",
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const contractBodyValue = watch("contract_body") || "";
  const contractFormatValue = watch("contract_body_format") || "markdown";
  const categoryValue = watch("category");

  const onSubmit = async (data: CreateTemplateRequest) => {
    const payload = {
      ...data,
      license_fee: data.license_fee
        ? Math.round(data.license_fee * 100)
        : undefined,
      docuseal_template_id: data.docuseal_template_id || undefined,
    };
    await onSave(payload);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 border-none bg-slate-50 rounded-3xl shadow-2xl">
        <form
          id="license-template-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col h-full"
        >
          <DialogHeader className="p-8 bg-white border-b border-slate-100 rounded-t-3xl shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-900 mb-1">
                  {initialData ? "Edit License Template" : "New License Template"}
                </DialogTitle>
                <p className="text-sm text-slate-500 font-medium tracking-tight">
                  Standardize your agency terms with dynamic placeholders
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="text-slate-500 font-bold hover:bg-slate-50 rounded-xl px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                  {isSubmitting ? "Saving..." : initialData ? "Update Template" : "Create Template"}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Template Identity */}
              <div className="p-8 bg-white rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-indigo-600 fill-indigo-600" />
                  </div>
                  <h3 className="font-bold text-slate-900">Template Identity</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-800 ml-1">Template Name *</Label>
                    <Input
                      {...register("template_name", { required: true })}
                      placeholder="e.g. Standard Social Media"
                      className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 transition-all font-medium"
                    />
                    {errors.template_name && <span className="text-red-500 text-xs font-bold px-1">This field is required</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-800 ml-1">Category *</Label>
                    <Select value={categoryValue} onValueChange={(val) => setValue("category", val)}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 transition-all font-medium">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat} className="rounded-lg font-medium">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && <span className="text-red-500 text-xs font-bold px-1">This field is required</span>}
                  </div>
                </div>
              </div>

              {/* Contract Editor */}
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-8">
                <ContractEditor
                  body={contractBodyValue}
                  format={contractFormatValue as any}
                  onChangeBody={(val) => setValue("contract_body", val)}
                  onChangeFormat={(val) => setValue("contract_body_format", val)}
                  variables={AVAILABLE_CONTRACT_VARIABLES}
                  placeholder="Write your contract template here. Use {variable} placeholders that will be filled in when using this template..."
                />
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
