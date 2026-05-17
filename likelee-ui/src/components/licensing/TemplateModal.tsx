import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
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
import { MandatoryHint } from "@/components/ui/field-hint";
import {
  FileSignature,
  Calendar,
  Users,
  Briefcase,
  Globe,
  Trash2,
  DollarSign,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateTemplateRequest) => Promise<void>;
  initialData?: LicenseTemplate | null;
  hideContract?: boolean;
  readOnly?: boolean;
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

const CATEGORY_TRANSLATION_KEYS: Record<string, string> = {
  "Social Media": "socialMedia",
  "E-commerce": "ecommerce",
  Advertising: "advertising",
  Editorial: "editorial",
  "Film & TV": "filmTv",
  Custom: "custom",
};

const CONTRACT_EXAMPLE_PLACEHOLDER = `LICENSE AGREEMENT

This License Agreement ("Agreement") is made between {client_name} ("Licensee") and {talent_name} ("Licensor").

1. GRANT OF RIGHTS:
Licensor hereby grants to Licensee a {exclusivity} license to use the content for {usage_scope} purposes.

2. TERM & TERRITORY:
The license shall be valid for {duration_days} days starting from {start_date} within the territory of {territory}.

3. COMPENSATION:
Licensee shall pay a total license fee of {license_fee} as consideration for the rights granted herein.

4. CUSTOM TERMS:
{custom_terms}

5. MODIFICATIONS:
Modifications to the content are {modifications_allowed}.

[Signed by {client_name}]`;

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  hideContract,
  readOnly = false,
}) => {
  const { t } = useTranslation("agency");
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateTemplateRequest>({
    defaultValues: {
      template_name: "",
      category: "",
      contract_body_format: "markdown",
      contract_body: "",
      description: "",
      usage_scope: "",
      duration_days: 90,
      territory: "Worldwide",
      exclusivity: "Non-exclusive",
      modifications_allowed: "No",
      license_fee: undefined,
      custom_terms: "",
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
          contract_body_format:
            (initialData.contract_body_format as any) || "markdown",
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
          modifications_allowed: "No",
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

  const [shakeFields, setShakeFields] = useState<Record<string, boolean>>({});

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

  const handleError = () => {
    const newShakeFields: Record<string, boolean> = {};
    const firstError = Object.keys(errors)[0];

    if (errors.template_name) newShakeFields.template_name = true;
    if (errors.category) newShakeFields.category = true;
    if (errors.exclusivity) newShakeFields.exclusivity = true;

    setShakeFields(newShakeFields);

    const firstErrorElement =
      document.querySelector(`[name="${firstError}"]`) ||
      document.getElementById(firstError);
    if (firstErrorElement) {
      firstErrorElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    setTimeout(() => {
      setShakeFields({});
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[98vw] sm:w-[95vw] h-[95vh] sm:h-[90vh] max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0 border-none bg-slate-50 rounded-2xl sm:rounded-3xl shadow-2xl">
        <form
          id="license-template-form"
          onSubmit={handleSubmit(onSubmit, handleError)}
          className="flex flex-col h-full"
        >
          <DialogHeader className="p-4 sm:p-8 bg-white border-b border-slate-100 rounded-t-3xl shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
                  {readOnly
                    ? t("agencyDashboard.licenseTemplates.modal.detailsTitle")
                    : initialData
                      ? t("agencyDashboard.licenseTemplates.modal.editTitle")
                      : t("agencyDashboard.licenseTemplates.modal.newTitle")}
                </DialogTitle>
                <p className="text-sm text-slate-500 font-medium tracking-tight">
                  {readOnly
                    ? t(
                        "agencyDashboard.licenseTemplates.modal.detailsSubtitle",
                      )
                    : t("agencyDashboard.licenseTemplates.modal.editSubtitle")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="text-slate-500 font-bold hover:bg-slate-50 rounded-xl px-4 sm:px-6 h-9 sm:h-10 text-sm"
                >
                  {readOnly
                    ? t("agencyDashboard.licenseTemplates.messages.close")
                    : t("agencyDashboard.licenseTemplates.deleteModal.cancel")}
                </Button>
                {!readOnly && (
                  <Button
                    type="submit"
                    form="license-template-form"
                    disabled={isSubmitting}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold h-9 sm:h-10 px-4 sm:px-8 rounded-xl shadow-lg shadow-indigo-100/50 transition-all active:scale-95 text-sm"
                  >
                    {isSubmitting
                      ? t("agencyDashboard.licenseTemplates.modal.saving")
                      : initialData
                        ? t(
                            "agencyDashboard.licenseTemplates.modal.updateTemplate",
                          )
                        : t(
                            "agencyDashboard.licenseTemplates.modal.createTemplate",
                          )}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <style>{`
              @keyframes field-shake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-5px); }
                40%, 80% { transform: translateX(5px); }
              }
              .animate-field-shake {
                animation: field-shake 0.4s ease-in-out;
              }
            `}</style>
            <div className="max-w-full lg:max-w-4xl mx-auto space-y-6 sm:space-y-8">
              {/* Template Identity */}
              <div className="p-4 sm:p-8 bg-white rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 rounded-2xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform shrink-0">
                    <FileSignature className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-slate-900">
                    {t(
                      "agencyDashboard.licenseTemplates.form.templateIdentity",
                    )}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 ml-1">
                      <Label className="text-sm font-bold text-slate-800">
                        {t(
                          "agencyDashboard.licenseTemplates.form.templateName",
                        )}
                      </Label>
                      <MandatoryHint />
                    </div>
                    <Input
                      {...register("template_name", { required: true })}
                      placeholder={t(
                        "agencyDashboard.licenseTemplates.form.templateNamePlaceholder",
                      )}
                      disabled={readOnly}
                      className={`h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 transition-all font-medium disabled:opacity-75 ${
                        errors.template_name
                          ? "border-amber-500 ring-2 ring-amber-100"
                          : ""
                      } ${shakeFields.template_name ? "animate-field-shake" : ""}`}
                    />
                    {errors.template_name && (
                      <span className="text-amber-700 text-xs font-bold px-1 dark:text-amber-400">
                        {t("agencyDashboard.licenseTemplates.form.required")}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 ml-1">
                      <Label className="text-sm font-bold text-slate-800">
                        {t("agencyDashboard.licenseTemplates.form.category")}
                      </Label>
                      <MandatoryHint />
                    </div>
                    <Controller
                      name="category"
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={readOnly}
                        >
                          <SelectTrigger
                            id="category"
                            className={`h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 transition-all font-medium disabled:opacity-75 ${
                              errors.category
                                ? "border-amber-500 ring-2 ring-amber-100"
                                : ""
                            } ${shakeFields.category ? "animate-field-shake" : ""}`}
                          >
                            <SelectValue
                              placeholder={t(
                                "agencyDashboard.licenseTemplates.form.selectCategory",
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200">
                            {CATEGORIES.map((cat) => (
                              <SelectItem
                                key={cat}
                                value={cat}
                                className="rounded-lg font-medium"
                              >
                                {t(
                                  `agencyDashboard.licenseTemplates.categories.${CATEGORY_TRANSLATION_KEYS[cat]}`,
                                  { defaultValue: cat },
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.category && (
                      <span className="text-amber-700 text-xs font-bold px-1 dark:text-amber-400">
                        {t("agencyDashboard.licenseTemplates.form.required")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 ml-1">
                  {t("agencyDashboard.licenseTemplates.form.description")}
                </Label>
                <Textarea
                  {...register("description")}
                  placeholder={t(
                    "agencyDashboard.licenseTemplates.form.descriptionPlaceholder",
                  )}
                  disabled={readOnly}
                  className="min-h-[80px] bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 transition-all font-medium resize-none disabled:opacity-75"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 ml-1">
                  {t("agencyDashboard.licenseTemplates.form.usageScope")}
                </Label>
                <Input
                  {...register("usage_scope")}
                  placeholder={t(
                    "agencyDashboard.licenseTemplates.form.usageScopePlaceholder",
                  )}
                  disabled={readOnly}
                  className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 transition-all font-medium disabled:opacity-75"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-800 ml-1">
                    {t("agencyDashboard.licenseTemplates.form.durationDays")}
                  </Label>
                  <Input
                    type="number"
                    {...register("duration_days", { valueAsNumber: true })}
                    disabled={readOnly}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 transition-all font-medium disabled:opacity-75"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-800 ml-1">
                    {t("agencyDashboard.licenseTemplates.form.territory")}
                  </Label>
                  <Input
                    {...register("territory")}
                    placeholder={t(
                      "agencyDashboard.licenseTemplates.form.territoryPlaceholder",
                    )}
                    disabled={readOnly}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 transition-all font-medium disabled:opacity-75"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 ml-1">
                  <Label className="text-sm font-bold text-slate-800">
                    {t("agencyDashboard.licenseTemplates.form.exclusivity")}
                  </Label>
                  <MandatoryHint />
                </div>
                <Controller
                  name="exclusivity"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={readOnly}
                    >
                      <SelectTrigger
                        id="exclusivity"
                        className={`h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 transition-all font-medium disabled:opacity-75 ${
                          errors.exclusivity
                            ? "border-amber-500 ring-2 ring-amber-100"
                            : ""
                        } ${shakeFields.exclusivity ? "animate-field-shake" : ""}`}
                      >
                        <SelectValue
                          placeholder={t(
                            "agencyDashboard.licenseTemplates.form.selectExclusivity",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem
                          value="Non-exclusive"
                          className="rounded-lg font-medium"
                        >
                          {t(
                            "agencyDashboard.licenseTemplates.form.exclusivityOptions.nonExclusive",
                          )}
                        </SelectItem>
                        <SelectItem
                          value="Category exclusive"
                          className="rounded-lg font-medium"
                        >
                          {t(
                            "agencyDashboard.licenseTemplates.form.exclusivityOptions.categoryExclusive",
                          )}
                        </SelectItem>
                        <SelectItem
                          value="Full exclusivity"
                          className="rounded-lg font-medium"
                        >
                          {t(
                            "agencyDashboard.licenseTemplates.form.exclusivityOptions.fullExclusivity",
                          )}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.exclusivity && (
                  <span className="text-amber-700 text-xs font-bold px-1 dark:text-amber-400">
                    {t("agencyDashboard.licenseTemplates.form.required")}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 ml-1">
                  {t("agencyDashboard.licenseTemplates.form.licenseFee")}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    {...register("license_fee", { valueAsNumber: true })}
                    placeholder={t(
                      "agencyDashboard.licenseTemplates.form.licenseFeePlaceholder",
                    )}
                    disabled={readOnly}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 transition-all font-medium pl-10 disabled:opacity-75"
                  />
                  <DollarSign className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-500 ml-1">
                  {t("agencyDashboard.licenseTemplates.form.licenseFeeHelp")}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 ml-1">
                  {t("agencyDashboard.licenseTemplates.form.customTerms")}
                </Label>
                <Textarea
                  {...register("custom_terms")}
                  placeholder={t(
                    "agencyDashboard.licenseTemplates.form.customTermsPlaceholder",
                  )}
                  disabled={readOnly}
                  className="min-h-[80px] bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 transition-all font-medium resize-none disabled:opacity-75"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-800 ml-1">
                  {t(
                    "agencyDashboard.licenseTemplates.form.modificationsAllowed",
                  )}
                </Label>
                <Select
                  onValueChange={(val) =>
                    setValue("modifications_allowed", val)
                  }
                  defaultValue={initialData?.modifications_allowed || "No"}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 transition-all font-medium disabled:opacity-75">
                    <SelectValue
                      placeholder={t(
                        "agencyDashboard.licenseTemplates.form.selectOption",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="Yes" className="rounded-lg font-medium">
                      {t("agencyDashboard.licenseTemplates.form.yes")}
                    </SelectItem>
                    <SelectItem value="No" className="rounded-lg font-medium">
                      {t("agencyDashboard.licenseTemplates.form.no")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contract Editor */}
            <div className="pt-4 sm:pt-8 pb-10">
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-4 sm:p-8">
                <ContractEditor
                  body={contractBodyValue}
                  format={contractFormatValue as any}
                  onChangeBody={(val) => setValue("contract_body", val)}
                  onChangeFormat={(val) =>
                    setValue("contract_body_format", val)
                  }
                  variables={AVAILABLE_CONTRACT_VARIABLES}
                  placeholder={CONTRACT_EXAMPLE_PLACEHOLDER}
                  readOnly={readOnly}
                />
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
