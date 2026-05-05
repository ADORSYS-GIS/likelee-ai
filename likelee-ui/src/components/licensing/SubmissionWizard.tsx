import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUserFriendlyError } from "@/utils/error-utils";
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
  getLicenseSubmissionDetails,
  syncLicenseSubmissionStatus,
} from "@/api/licenseSubmissions";
import { getAgencyTalents, getAgencyBrandConnections } from "@/api/functions";
import { ContractEditor } from "./ContractEditor";
import { DocuSealBuilderModal } from "./DocuSealBuilderModal";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  FileText,
  Layout,
  RefreshCw,
  ChevronsUpDown,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { DocusealForm } from "@docuseal/react";

interface SubmissionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  template: LicenseTemplate;
  onComplete: () => void;
  isSportsAgency?: boolean;
  initialValues?: {
    client_name?: string;
    client_email?: string;
    talent_name?: string;
    brand_id?: string;
    talent_id?: string;
    duration_days?: number;
    license_fee?: number;
    start_date?: string;
    custom_terms?: string;
    requires_agency_signature?: boolean;
    territory?: string;
    exclusivity?: string;
    modifications_allowed?: string;
  } | null;
  isRenewalPrefill?: boolean;
  oldLicenseId?: string; // ID of expired license being renewed
  brandRequestContext?: {
    brand_id: string;
    brand_name?: string;
    brand_email?: string;
    licensing_request_id?: string;
    talent_id?: string;
    talent_name?: string;
  } | null;
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
  isSportsAgency = false,
  initialValues,
  isRenewalPrefill = false,
  oldLicenseId,
  brandRequestContext,
}) => {
  const entitySingularTitle = isSportsAgency ? "Athlete" : "Talent";
  const entityPluralLower = isSportsAgency ? "athletes" : "talents";
  const entitySingularLower = isSportsAgency ? "athlete" : "talent";
  const [step, setStep] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [currentTemplate, setCurrentTemplate] =
    useState<LicenseTemplate>(template);
  const [requiresAgencySignature, setRequiresAgencySignature] = useState(false);
  const [agencySignOpen, setAgencySignOpen] = useState(false);
  const [agencySignUrl, setAgencySignUrl] = useState<string | null>(null);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(
    null,
  );
  const [talents, setTalents] = useState<any[]>([]);
  const [selectedTalentIds, setSelectedTalentIds] = useState<string[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [allowBrandChange, setAllowBrandChange] = useState(false);
  const [talentPopoverOpen, setTalentPopoverOpen] = useState(false);
  const [talentSearchQuery, setTalentSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: brandConnectionsData } = useQuery({
    queryKey: ["agency", "brand-connections"],
    queryFn: getAgencyBrandConnections,
    enabled: isOpen,
  });

  const brandOptions = useMemo(() => {
    const rows = Array.isArray(brandConnectionsData?.connections)
      ? brandConnectionsData.connections
      : [];
    return rows.map((row: any) => ({
      id: String(row?.brand_id || ""),
      name: String(
        row?.brands?.company_name ||
          row?.brands?.name ||
          row?.brand_name ||
          "Brand",
      ),
      email: String(row?.brands?.email || row?.brand_email || "").trim(),
    }));
  }, [brandConnectionsData]);

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
  const brandRequestId = brandRequestContext?.licensing_request_id || "";
  const brandRequestBrandId = brandRequestContext?.brand_id || "";
  const brandRequestBrandName = brandRequestContext?.brand_name || "";
  const brandRequestBrandEmail = brandRequestContext?.brand_email || "";
  const brandRequestTalentId = brandRequestContext?.talent_id || "";
  const brandRequestTalentName = brandRequestContext?.talent_name || "";

  // Computed live: which key identity values are absent from the contract body.
  // Updates as the agency types so the warning banner and Next button disable
  // state stay in sync — including if they delete the names after inserting.
  const missingIdentityFields = useMemo(() => {
    if (step !== 2) return [];
    const bodyLower = (formData.contract_body || "").toLowerCase();
    const missing: string[] = [];
    const talentVal = (formData.talent_name || "").trim().toLowerCase();
    const clientVal = (formData.client_name || "").trim().toLowerCase();
    if (talentVal && !bodyLower.includes(talentVal))
      missing.push("talent_name_placeholder");
    if (clientVal && !bodyLower.includes(clientVal))
      missing.push("client_name_placeholder");
    return missing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    formData.contract_body,
    formData.talent_name,
    formData.client_name,
  ]);
  const builderExternalId = useMemo(
    () =>
      currentTemplate?.id
        ? `temp-${currentTemplate.id}-${Date.now()}`
        : undefined,
    [currentTemplate?.id, isOpen],
  );

  // Auto-enable dropdown and pre-select brand when coming from brand request
  useEffect(() => {
    const prefilledBrandId = brandRequestBrandId || initialValues?.brand_id;
    const prefilledBrandName =
      brandRequestBrandName || initialValues?.client_name;
    const prefilledBrandEmail =
      brandRequestBrandEmail || initialValues?.client_email;

    if (isOpen && prefilledBrandId && brandOptions.length > 0) {
      setAllowBrandChange(true); // Turn on the toggle
      const match = brandOptions.find((b) => b.id === prefilledBrandId);
      if (match) {
        setSelectedBrandId(match.id);
        setValue("client_name", match.name);
        if (match.email) setValue("client_email", match.email);
      } else if (prefilledBrandId) {
        // Brand not in connections, but we have the ID from context
        setSelectedBrandId(prefilledBrandId);
        if (prefilledBrandName) setValue("client_name", prefilledBrandName);
        if (prefilledBrandEmail) setValue("client_email", prefilledBrandEmail);
      }
    }
  }, [
    isOpen,
    brandRequestBrandId,
    brandRequestBrandName,
    brandRequestBrandEmail,
    initialValues?.brand_id,
    initialValues?.client_name,
    initialValues?.client_email,
    brandOptions,
    setValue,
  ]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDraftId(null);
      setRequiresAgencySignature(
        Boolean(initialValues?.requires_agency_signature),
      );
      setAgencySignOpen(false);
      setAgencySignUrl(null);
      setCurrentSubmissionId(null);
      setSelectedTalentIds(
        brandRequestTalentId
          ? [brandRequestTalentId]
          : initialValues?.talent_id
            ? [initialValues.talent_id]
            : [],
      );
      reset({
        client_name: brandRequestBrandName || initialValues?.client_name || "",
        talent_name: brandRequestTalentName || initialValues?.talent_name || "",
        start_date:
          initialValues?.start_date ||
          template.start_date ||
          new Date().toISOString().split("T")[0],
        duration_days:
          initialValues?.duration_days ?? template.duration_days ?? 90,
        territory:
          initialValues?.territory || template.territory || "Worldwide",
        exclusivity:
          initialValues?.exclusivity || template.exclusivity || "Non-exclusive",
        modifications_allowed:
          initialValues?.modifications_allowed ||
          template.modifications_allowed ||
          "",
        license_fee:
          initialValues?.license_fee ??
          (template.license_fee ? template.license_fee / 100 : 0),
        custom_terms:
          initialValues?.custom_terms || template.custom_terms || "",
        contract_body: template.contract_body || "",
        client_email:
          brandRequestBrandEmail || initialValues?.client_email || "",
      });

      // Fetch agency talents
      getAgencyTalents()
        .then((res) => {
          // Deduplicate talents by id to prevent duplicates in dropdown
          const seen = new Set<string>();
          const uniqueTalents = (res || []).filter((t: any) => {
            if (!t.id || seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
          });
          setTalents(uniqueTalents);
        })
        .catch((err) => {
          console.error(`Failed to fetch ${entityPluralLower}:`, err);
        });
    }
  }, [
    isOpen,
    reset,
    template,
    initialValues?.client_name,
    initialValues?.talent_name,
    initialValues?.start_date,
    initialValues?.duration_days,
    initialValues?.territory,
    initialValues?.exclusivity,
    initialValues?.modifications_allowed,
    initialValues?.license_fee,
    initialValues?.custom_terms,
    initialValues?.client_email,
    initialValues?.talent_id,
    initialValues?.requires_agency_signature,
    brandRequestId,
    brandRequestBrandName,
    brandRequestBrandEmail,
    brandRequestTalentId,
    brandRequestTalentName,
  ]);

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
        // Debug: log which fields are missing
        const missing = [];
        if (!currentData.client_name) missing.push("client_name");
        if (!currentData.talent_name) missing.push("talent_name");
        if (!currentData.client_email) missing.push("client_email");
        console.error(
          "Validation failed. Missing fields:",
          missing,
          "Current data:",
          currentData,
        );

        toast({
          title: "Missing Information",
          description: "Please fill in all required fields marked with *",
          variant: "warning",
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
          talent_ids:
            selectedTalentIds.length > 0 ? selectedTalentIds : undefined,
          talent_id: selectedTalentIds[0] || undefined,
          talent_names: currentData.talent_name,
          license_fee: Math.round(currentData.license_fee * 100),
          duration_days: currentData.duration_days,
          start_date: currentData.start_date,
          custom_terms: currentData.custom_terms,
          docuseal_template_id: currentTemplate.docuseal_template_id,
          requires_agency_signature: requiresAgencySignature,
          licensing_request_id: brandRequestContext?.licensing_request_id,
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

        // Detect which key identity placeholders were absent from the template.
        // missingIdentityFields (computed) will handle the live warning in step 2.

        setStep(2);
      } catch (err: any) {
        toast({
          title: "Preparation Failed",
          description:
            getUserFriendlyError(err) ||
            "We couldn't prepare this submission. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSyncing(false);
      }
    } else if (step === 2) {
      // Validate contract body before proceeding
      if (!currentData.contract_body || !currentData.contract_body.trim()) {
        toast({
          title: "Contract Body Required",
          description:
            "The contract body cannot be empty. Please ensure the template has contract content or add content before proceeding.",
          variant: "warning",
        });
        return;
      }

      // Hard block: the rendered contract body must contain the talent name
      // and client/brand name. This catches cases where:
      //   - The template never used the placeholders (hardcoded text that
      //     doesn't match the current deal), OR
      //   - The agency edited the body in step 2 and removed the names.
      // We check the actual values from step 1, not just placeholder presence.
      const bodyLower = currentData.contract_body.toLowerCase();
      const talentNameValue = (currentData.talent_name || "")
        .trim()
        .toLowerCase();
      const clientNameValue = (currentData.client_name || "")
        .trim()
        .toLowerCase();
      const identityErrors: string[] = [];

      if (talentNameValue && !bodyLower.includes(talentNameValue)) {
        identityErrors.push(`talent name "${currentData.talent_name}"`);
      }
      if (clientNameValue && !bodyLower.includes(clientNameValue)) {
        identityErrors.push(`brand name "${currentData.client_name}"`);
      }

      if (identityErrors.length > 0) {
        toast({
          title: "Contract is missing required identity information",
          description: `The contract body must include the ${identityErrors.join(" and ")}. Use the insert buttons below the editor to add them, or type them directly.`,
          variant: "destructive",
        });
        return;
      }
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
        description:
          getUserFriendlyError(err) ||
          "We couldn't continue to document setup. Please try again.",
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
          talent_ids:
            selectedTalentIds.length > 0 ? selectedTalentIds : undefined,
          talent_id: selectedTalentIds[0] || undefined,
          talent_names: currentData.talent_name,
          license_fee: Math.round(currentData.license_fee * 100),
          duration_days: currentData.duration_days,
          start_date: currentData.start_date,
          custom_terms: currentData.custom_terms,
          docuseal_template_id: currentTemplate.docuseal_template_id,
          requires_agency_signature: requiresAgencySignature,
          licensing_request_id: brandRequestContext?.licensing_request_id,
        });
        submissionId = draft?.id;
        if (!submissionId) {
          throw new Error("Draft creation returned no ID");
        }
        setDraftId(submissionId);
      }

      // Step 2: Finalize the submission (this creates the licensing_request)
      let finalizeResult = await finalizeLicenseSubmission(submissionId, {
        docuseal_template_id: currentTemplate.docuseal_template_id,
        client_name: currentData.client_name,
        client_email: currentData.client_email,
        talent_ids:
          selectedTalentIds.length > 0 ? selectedTalentIds : undefined,
        talent_id: selectedTalentIds[0] || undefined,
        talent_names: currentData.talent_name,
        requires_agency_signature: requiresAgencySignature,
        licensing_request_id: brandRequestContext?.licensing_request_id,
        old_license_id: oldLicenseId, // Pass the old license ID for renewal tracking
      });

      const finalizedSubmissionId = (finalizeResult as any)?.id || submissionId;
      let embedUrl =
        (finalizeResult as any)?.agency_embed_src ||
        ((finalizeResult as any)?.agency_submitter_slug
          ? `https://docuseal.co/s/${(finalizeResult as any).agency_submitter_slug}`
          : null);

      // Finalize can succeed before the agency signer URL is present on the first response.
      // Refresh once so we don't bounce the user out of the signing flow.
      if (requiresAgencySignature && !embedUrl && finalizedSubmissionId) {
        finalizeResult = await getLicenseSubmissionDetails(
          finalizedSubmissionId,
        );
        embedUrl =
          (finalizeResult as any)?.agency_embed_src ||
          ((finalizeResult as any)?.agency_submitter_slug
            ? `https://docuseal.co/s/${(finalizeResult as any).agency_submitter_slug}`
            : null);
      }

      if (requiresAgencySignature) {
        if (!embedUrl) {
          throw new Error(
            "The agency signature link is not ready yet. Please reopen the submission and try again.",
          );
        }

        setCurrentSubmissionId(finalizedSubmissionId);
        // Close the builder before opening the signing modal so we don't
        // bounce back through the wizard state.
        setStep(2);
        setAgencySignUrl(embedUrl);
        setAgencySignOpen(true);
        toast({
          title: "Agency signature required",
          description:
            "Complete your signature to release this contract to the client.",
        });
        return;
      }

      toast({
        title: "Success",
        description: "License sent and recorded successfully.",
      });

      onComplete();
      onClose();
    } catch (err: any) {
      toast({
        title: "Send Failed",
        description:
          getUserFriendlyError(err) ||
          "We couldn't send this contract right now. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        className={`max-w-6xl w-[98vw] sm:w-[95vw] h-[95vh] sm:h-[92vh] p-0 border-none bg-slate-50 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 ${step === 3 ? "translate-y-full opacity-0 pointer-events-none" : ""}`}
      >
        <DialogDescription className="sr-only">
          Fill in deal details, select talent, and finalize the contract.
        </DialogDescription>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Wizard Header / Progress */}
          <div className="bg-white p-4 sm:p-8 border-b border-slate-100 rounded-t-3xl shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-8 mb-6 sm:mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-indigo-50 p-1.5 rounded-lg">
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                    Step {step} of 3
                  </span>
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900">
                  {step === 1 ? "Deal Specifics" : "Content Review"}
                </DialogTitle>
                <p className="text-sm text-slate-500 font-medium">
                  {step === 1
                    ? "Enter the core details of this licensing deal"
                    : "Review and personalize the contract content"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="rounded-xl font-bold text-slate-500 px-4 sm:px-6 h-9 sm:h-10 text-sm"
                >
                  Cancel
                </Button>
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="rounded-xl font-bold border-slate-200 h-9 sm:h-10 text-sm px-3 sm:px-4"
                  >
                    <ArrowLeft className="w-4 h-4 sm:mr-2" />{" "}
                    <span className="hidden sm:inline">Back</span>
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={
                    isSyncing ||
                    (step === 2 && missingIdentityFields.length > 0)
                  }
                  title={
                    step === 2 && missingIdentityFields.length > 0
                      ? "Add the missing talent and brand names to the contract body before proceeding"
                      : undefined
                  }
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold h-9 sm:h-10 px-4 sm:px-8 rounded-xl shadow-lg shadow-indigo-100/50 transition-all active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? "..." : step === 3 ? "Finalize" : "Next"}
                  {!isSyncing && step < 3 && (
                    <ArrowRight className="w-4 h-4 ml-1.5 sm:ml-2" />
                  )}
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-4 px-1">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex-1 flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      step === s
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

          <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-hide">
            {step === 1 && (
              <div className="max-w-full lg:max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-10">
                {isRenewalPrefill && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-white/80 p-2 text-emerald-600 shadow-sm">
                        <RefreshCw className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-900">
                          Renewal Prefill
                        </p>
                        <p className="text-sm text-emerald-800">
                          This renewal was prefilled from the previous license
                          request. Adjust anything you need before sending.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* External client route hint — shown only when the agency
                    initiates the contract themselves (no brand request context).
                    Explains why all fields are open and reminds the agency of
                    the natural workflow they should have completed first. */}
                {!brandRequestBrandId && !isRenewalPrefill && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-white/80 p-2 text-slate-500 shadow-sm shrink-0">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Creating a contract for an external client
                        </p>
                        <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">
                          You're initiating this contract directly — all fields
                          are open for you to fill in. Enter the client's
                          details and select the {entitySingularLower} you've
                          agreed to license, typically based on the package you
                          sent and the client's selection from it.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="p-8 bg-white rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h3 className="font-bold text-slate-900">
                        Identification
                      </h3>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-800 ml-1">
                          Brand Name *
                        </Label>
                        {brandRequestBrandId ? (
                          // Locked — brand is fixed when coming from a brand request
                          <div className="h-12 bg-slate-100 border border-slate-200 rounded-xl font-medium px-3 flex items-center gap-2 text-slate-700">
                            <span className="flex-1 truncate">
                              {formData.client_name || brandRequestBrandName}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full shrink-0">
                              Locked
                            </span>
                          </div>
                        ) : (
                          <Input
                            {...register("client_name", { required: true })}
                            placeholder="e.g. Nike, Spotify"
                            className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium focus:ring-4 focus:ring-indigo-50 transition-all"
                          />
                        )}
                        {errors.client_name && (
                          <p className="text-amber-700 text-xs font-bold px-1 dark:text-amber-400">
                            This field is mandatory.
                          </p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-800 ml-1">
                          {`${entitySingularTitle} Name *`}
                        </Label>
                        <input
                          type="hidden"
                          {...register("talent_name", { required: true })}
                        />
                        {brandRequestTalentId ? (
                          // Locked — talent is fixed when coming from a brand request.
                          // The brand selected this specific talent; the agency must not
                          // be able to swap them out.
                          <div className="h-auto min-h-[48px] bg-slate-100 border border-slate-200 rounded-xl font-medium px-3 py-2 flex items-center gap-2">
                            <div className="flex flex-wrap gap-1.5 flex-1">
                              {(formData.talent_name || brandRequestTalentName)
                                .split(", ")
                                .filter(Boolean)
                                .map((name) => (
                                  <Badge
                                    key={name}
                                    variant="secondary"
                                    className="bg-white text-indigo-600 border-indigo-100 rounded-lg px-2 py-0.5"
                                  >
                                    {name}
                                  </Badge>
                                ))}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full shrink-0">
                              Locked
                            </span>
                          </div>
                        ) : (
                          <Popover
                            open={talentPopoverOpen}
                            onOpenChange={setTalentPopoverOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full h-auto min-h-[48px] justify-between bg-slate-50 border-slate-200 rounded-xl hover:bg-slate-100 transition-all font-medium py-2 px-3"
                              >
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  {formData.talent_name ? (
                                    formData.talent_name
                                      .split(", ")
                                      .map((name) => (
                                        <Badge
                                          key={name}
                                          variant="secondary"
                                          className="bg-white text-indigo-600 border-indigo-100 rounded-lg px-2 py-0.5 flex items-center gap-1 group/badge"
                                        >
                                          {name}
                                          <X
                                            className="h-3 w-3 cursor-pointer hover:text-indigo-800"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const selected =
                                                formData.talent_name
                                                  .split(", ")
                                                  .filter((n) => n !== name)
                                                  .join(", ");
                                              setValue("talent_name", selected);
                                            }}
                                          />
                                        </Badge>
                                      ))
                                  ) : (
                                    <span className="text-slate-400">
                                      {`Select ${entityPluralLower}...`}
                                    </span>
                                  )}
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-slate-500" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[400px] p-0 rounded-2xl border-slate-200 shadow-2xl overflow-hidden"
                              align="start"
                            >
                              {talentPopoverOpen && (
                                <Command
                                  key="talent-command"
                                  className="border-none"
                                  shouldFilter={false}
                                >
                                  <CommandInput
                                    placeholder={`Search ${entitySingularLower}...`}
                                    className="border-none focus:ring-0 h-12"
                                    value={talentSearchQuery}
                                    onValueChange={setTalentSearchQuery}
                                  />
                                  <CommandList className="max-h-[300px]">
                                    <CommandEmpty className="py-6 text-center text-sm text-slate-500 font-medium">
                                      {`No ${entitySingularLower} found.`}
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {talents
                                        .filter((t) => {
                                          const talentName =
                                            t.full_name ||
                                            t.stage_name ||
                                            t.full_legal_name ||
                                            t.email ||
                                            `Unknown ${entitySingularTitle}`;
                                          if (!talentSearchQuery) return true;
                                          return talentName
                                            .toLowerCase()
                                            .includes(
                                              talentSearchQuery.toLowerCase(),
                                            );
                                        })
                                        .map((t) => {
                                          const talentName =
                                            t.full_name ||
                                            t.stage_name ||
                                            t.full_legal_name ||
                                            t.email ||
                                            `Unknown ${entitySingularTitle}`;
                                          // Check selection by ID to handle duplicate names
                                          const isSelected =
                                            t.id &&
                                            selectedTalentIds.includes(t.id);
                                          return (
                                            <CommandItem
                                              key={t.id}
                                              value={talentName}
                                              onSelect={() => {
                                                const currentNames =
                                                  formData.talent_name
                                                    ? formData.talent_name.split(
                                                        ", ",
                                                      )
                                                    : [];
                                                let updatedNames;
                                                let updatedIds = [
                                                  ...selectedTalentIds,
                                                ];

                                                if (isSelected) {
                                                  updatedNames =
                                                    currentNames.filter(
                                                      (n) => n !== talentName,
                                                    );
                                                  // Remove ID
                                                  if (t.id) {
                                                    updatedIds =
                                                      updatedIds.filter(
                                                        (id) => id !== t.id,
                                                      );
                                                  }
                                                } else {
                                                  if (talentName) {
                                                    updatedNames = [
                                                      ...currentNames,
                                                      talentName,
                                                    ];
                                                  } else {
                                                    updatedNames = currentNames;
                                                  }
                                                  // Add ID
                                                  if (
                                                    t.id &&
                                                    !updatedIds.includes(t.id)
                                                  ) {
                                                    updatedIds.push(t.id);
                                                  }
                                                }
                                                setSelectedTalentIds(
                                                  updatedIds,
                                                );
                                                setValue(
                                                  "talent_name",
                                                  updatedNames.join(", "),
                                                );
                                              }}
                                              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors rounded-lg m-1"
                                            >
                                              <div className="relative">
                                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                                  <AvatarImage
                                                    src={t.profile_photo_url}
                                                  />
                                                  <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold text-xs uppercase">
                                                    {t.full_name?.substring(
                                                      0,
                                                      2,
                                                    ) || "UT"}
                                                  </AvatarFallback>
                                                </Avatar>
                                                {isSelected && (
                                                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-white">
                                                    <Check className="h-2.5 w-2.5 text-white" />
                                                  </div>
                                                )}
                                              </div>
                                              <div className="flex flex-col">
                                                <span
                                                  className={cn(
                                                    "font-bold text-slate-900",
                                                    isSelected &&
                                                      "text-indigo-600",
                                                  )}
                                                >
                                                  {talentName}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                  {`Agency ${entitySingularTitle}`}
                                                </span>
                                              </div>
                                            </CommandItem>
                                          );
                                        })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              )}
                            </PopoverContent>
                          </Popover>
                        )}
                        {errors.talent_name && (
                          <span className="text-amber-700 text-xs font-bold px-1 dark:text-amber-400">
                            {`This ${entitySingularLower} is mandatory.`}
                          </span>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between ml-1 gap-2">
                          <Label className="text-sm font-bold text-slate-800 whitespace-nowrap">
                            Client Email *
                          </Label>
                          {!brandRequestBrandId && brandOptions.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Label
                                htmlFor="allow-brand-change-wizard"
                                className="text-xs text-gray-500 cursor-pointer"
                              >
                                Send to connected brands
                              </Label>
                              <Switch
                                id="allow-brand-change-wizard"
                                checked={allowBrandChange}
                                onCheckedChange={setAllowBrandChange}
                              />
                            </div>
                          )}
                        </div>

                        {brandRequestBrandId ? (
                          // Locked — client email is fixed when coming from a brand request
                          <div className="h-12 bg-slate-100 border border-slate-200 rounded-xl font-medium px-3 flex items-center gap-2 text-slate-700">
                            <span className="flex-1 truncate">
                              {formData.client_email || brandRequestBrandEmail}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full shrink-0">
                              Locked
                            </span>
                          </div>
                        ) : brandOptions.length > 0 && allowBrandChange ? (
                          <>
                            <input
                              type="hidden"
                              {...register("client_email", { required: true })}
                            />
                            <Select
                              value={selectedBrandId}
                              onValueChange={(val) => {
                                setSelectedBrandId(val);
                                const match = brandOptions.find(
                                  (b) => b.id === val,
                                );
                                if (match) {
                                  setValue("client_name", match.name);
                                  if (match.email)
                                    setValue("client_email", match.email);
                                }
                              }}
                            >
                              <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium focus:ring-4 focus:ring-indigo-50 transition-all">
                                <SelectValue placeholder="Select brand" />
                              </SelectTrigger>
                              <SelectContent>
                                {brandRequestContext &&
                                  brandRequestContext.brand_id &&
                                  !brandOptions.some(
                                    (b) =>
                                      b.id === brandRequestContext.brand_id,
                                  ) && (
                                    <SelectItem
                                      value={brandRequestContext.brand_id}
                                    >
                                      {brandRequestContext.brand_name ||
                                        "Selected Brand"}
                                    </SelectItem>
                                  )}
                                {brandOptions.map((brand) => (
                                  <SelectItem key={brand.id} value={brand.id}>
                                    {brand.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 ml-1">
                              Select from your connected brands. Toggle off to
                              enter email manually.
                            </p>
                          </>
                        ) : (
                          <>
                            <Input
                              type="email"
                              {...register("client_email", { required: true })}
                              placeholder="client@example.com"
                              className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium focus:ring-4 focus:ring-indigo-50 transition-all"
                            />
                            {brandOptions.length > 0 && (
                              <p className="text-xs text-gray-500 ml-1">
                                Toggle on to select from connected brands.
                              </p>
                            )}
                          </>
                        )}
                        <p className="text-[11px] font-medium text-amber-700 ml-1 dark:text-amber-400">
                          This field is mandatory.
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-bold text-slate-800">
                            Agency signs first (on platform)
                          </Label>
                          <Switch
                            checked={requiresAgencySignature}
                            onCheckedChange={setRequiresAgencySignature}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Client receives the contract only after agency
                          signature.
                        </p>
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
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
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
                        <div className="space-y-3">
                          <Label className="text-sm font-bold text-slate-800 ml-1">
                            Territory
                          </Label>
                          <Input
                            {...register("territory")}
                            className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
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
                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-800 ml-1">
                          Modifications Allowed
                        </Label>
                        <Input
                          {...register("modifications_allowed")}
                          placeholder="e.g. Yes, with approval"
                          className="h-12 bg-slate-50 border-slate-200 rounded-xl font-medium"
                        />
                      </div>
                      <div className="space-y-3">
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
                    className="min-h-[140px] bg-slate-50 border-slate-200 rounded-2xl font-medium p-6"
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
                    onChangeFormat={() => {}} // Format locked in submission
                    variables={AVAILABLE_CONTRACT_VARIABLES}
                    placeholder="The contract content will appear here..."
                  />
                </div>

                {missingIdentityFields.length > 0 ? (
                  // ── Warning: key identity values are absent from the body ──
                  <div className="mt-6 p-5 bg-amber-50 border border-amber-300 rounded-2xl space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-amber-400 p-1.5 rounded-lg mt-0.5 shrink-0">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-amber-900 text-sm">
                          Contract is missing required identity information
                        </p>
                        <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                          The contract body does not contain the{" "}
                          {missingIdentityFields.includes(
                            "talent_name_placeholder",
                          ) &&
                          missingIdentityFields.includes(
                            "client_name_placeholder",
                          )
                            ? "talent name or brand name"
                            : missingIdentityFields.includes(
                                  "talent_name_placeholder",
                                )
                              ? "talent name"
                              : "brand name"}
                          . You cannot proceed until these are present. Click
                          below to insert them, or type them directly in the
                          editor above.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-9">
                      {missingIdentityFields.map((placeholder) => {
                        const label =
                          placeholder === "talent_name_placeholder"
                            ? "Talent"
                            : "Brand";
                        const value =
                          placeholder === "talent_name_placeholder"
                            ? formData.talent_name
                            : formData.client_name;
                        return (
                          <button
                            key={placeholder}
                            type="button"
                            onClick={() => {
                              const insertion = `\n\n**${label}:** ${value}`;
                              setValue(
                                "contract_body",
                                (formData.contract_body || "") + insertion,
                              );
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 text-xs font-bold rounded-lg transition-colors"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4.5v15m7.5-7.5h-15"
                              />
                            </svg>
                            Insert {label} Name ({value})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // ── Success: all key placeholders present ─────────────────
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
                        deal specifics. You can still make quick edits directly
                        in the editor before finalizing.
                      </p>
                    </div>
                  </div>
                )}
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
          externalId={builderExternalId}
          contractBody={formData.contract_body} // Pass the deal-specific body!
          builderRoles={
            requiresAgencySignature
              ? ["First Party", "Second Party"]
              : ["First Party"]
          }
          onSend={handleFinalSend}
          isSending={isSyncing}
          onSave={() => {
            // Keep open, wait for Final Send
          }}
        />
      )}

      <Dialog
        open={agencySignOpen}
        onOpenChange={(v) => {
          if (!v) {
            setAgencySignOpen(false);
            onComplete();
            onClose();
          }
        }}
      >
        <DialogContent className="fixed !inset-0 bg-background w-screen h-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none border-none p-0 flex flex-col outline-none">
          <DialogDescription className="sr-only">
            Review and complete the agency signature.
          </DialogDescription>
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Agency Signature</DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full bg-gray-50 overflow-hidden flex flex-col">
            <div className="px-6 py-3 border-b border-gray-200 bg-white shadow-sm flex items-center justify-between shrink-0">
              <div className="text-xs sm:text-sm text-gray-700 font-medium flex items-center gap-4">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  Party mapping:
                </span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-100 px-3 py-1 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-red-500 mr-2 shadow-sm shadow-red-200" />
                    First Party = Agency
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-300" />
                  <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 shadow-sm shadow-blue-200" />
                    Second Party = Client
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {agencySignUrl ? <DocusealForm src={agencySignUrl} /> : null}
            </div>
          </div>
          <div className="p-4 border-t flex justify-end">
            <Button
              variant="outline"
              onClick={async () => {
                if (currentSubmissionId) {
                  try {
                    await syncLicenseSubmissionStatus(currentSubmissionId);
                  } catch {
                    // ignore transient sync issues
                  }
                }
                setAgencySignOpen(false);
                onComplete();
                onClose();
              }}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
