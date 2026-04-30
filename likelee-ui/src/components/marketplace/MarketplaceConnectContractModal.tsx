import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DocusealForm } from "@docuseal/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContractEditor } from "@/components/licensing/ContractEditor";
import { DocuSealBuilderModal } from "@/components/licensing/DocuSealBuilderModal";
import { getLicenseTemplates, LicenseTemplate } from "@/api/licenseTemplates";
import {
  createMarketplaceCreatorContract,
  finalizeMarketplaceCreatorContract,
  syncMarketplaceContract,
  MarketplaceContractSummary,
} from "@/api/marketplaceContracts";
import { Loader2, ExternalLink } from "lucide-react";

const REQUIRED_VARIABLES = [
  "{agency_name}",
  "{creator_name}",
  "{commission_rate}",
  "{valid_from}",
  "{valid_until}",
];

const DEFAULT_BODY = `MARKETPLACE CONNECTION AGREEMENT

This agreement is entered into between {agency_name} and {creator_name}.

Commission rate: {commission_rate}
Effective date: {valid_from}
End date: {valid_until}

The parties agree that marketplace-connected work during this term will follow the commission rate stated above.`;

function deriveTemplateBody(template?: LicenseTemplate | null): string {
  const savedBody = template?.contract_body?.trim();
  if (savedBody) return savedBody;

  const templateName =
    template?.template_name?.trim() || "MARKETPLACE CONTRACT";
  const category = template?.category?.trim() || "Marketplace";
  const usageScope =
    template?.usage_scope?.trim() || "marketplace-connected creator services";
  const territory = template?.territory?.trim() || "Worldwide";
  const exclusivity = template?.exclusivity?.trim() || "Non-exclusive";
  const durationDays =
    typeof template?.duration_days === "number" ? template.duration_days : 90;
  const modifications =
    template?.modifications_allowed?.trim() || "subject to written approval";
  const customTerms = template?.custom_terms?.trim();

  return `${templateName}

This agreement is entered into between {agency_name} and {creator_name}.

Category: ${category}
Scope: ${usageScope}
Commission rate: {commission_rate}
Effective date: {valid_from}
End date: {valid_until}
Territory: ${territory}
Exclusivity: ${exclusivity}
Indicative duration: ${durationDays} days
Modifications: ${modifications}

${customTerms ? `Additional terms:\n${customTerms}\n\n` : ""}The parties agree that marketplace-connected work during this term will follow the commission rate stated above.`;
}

type Profile = {
  id: string;
  display_name: string;
};

export function MarketplaceConnectContractModal({
  open,
  profile,
  onClose,
  onSuccess,
}: {
  open: boolean;
  profile: Profile | null;
  onClose: () => void;
  onSuccess?: (contract?: MarketplaceContractSummary) => void;
}) {
  const [templateId, setTemplateId] = useState<string>("");
  const [commissionRate, setCommissionRate] = useState<string>("20");
  const [validFrom, setValidFrom] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [body, setBody] = useState<string>(DEFAULT_BODY);
  const [format, setFormat] = useState<"markdown" | "html">("markdown");
  const [validationError, setValidationError] = useState<string>("");
  const [draftContract, setDraftContract] =
    useState<MarketplaceContractSummary | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [agencySignUrl, setAgencySignUrl] = useState<string | null>(null);
  const [agencySignOpen, setAgencySignOpen] = useState(false);

  const templatesQuery = useQuery({
    queryKey: ["license-templates", "marketplace-connect"],
    queryFn: getLicenseTemplates,
    enabled: open,
  });

  const templates = useMemo(
    () => (Array.isArray(templatesQuery.data) ? templatesQuery.data : []),
    [templatesQuery.data],
  );

  useEffect(() => {
    if (!open) return;
    const today = new Date();
    const ninetyDays = new Date(today);
    ninetyDays.setDate(today.getDate() + 90);
    const iso = (d: Date) => d.toISOString().split("T")[0];
    setTemplateId("");
    setBody(DEFAULT_BODY);
    setFormat("markdown");
    setValidationError("");
    setDraftContract(null);
    setBuilderOpen(false);
    setAgencySignOpen(false);
    setAgencySignUrl(null);
    setValidFrom((prev) => prev || iso(today));
    setValidUntil((prev) => prev || iso(ninetyDays));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (templates.length > 0 && !templateId) {
      const first = templates[0];
      setTemplateId(first.id);
      setBody(deriveTemplateBody(first));
      setFormat(
        ((first.contract_body_format as "markdown" | "html") || "markdown") as
          | "markdown"
          | "html",
      );
    }
  }, [open, templates, templateId]);

  useEffect(() => {
    if (!templateId) return;
    const template = templates.find((entry) => entry.id === templateId);
    if (!template) return;
    setBody(deriveTemplateBody(template));
    setFormat(
      ((template.contract_body_format as "markdown" | "html") || "markdown") as
        | "markdown"
        | "html",
    );
  }, [templateId, templates]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const trimmedBody = body.trim();
      const missing = REQUIRED_VARIABLES.filter(
        (placeholder) => !trimmedBody.includes(placeholder),
      );
      if (missing.length > 0) {
        throw new Error(`Missing required placeholders: ${missing.join(", ")}`);
      }
      return await createMarketplaceCreatorContract({
        profile_type: "creator",
        target_id: profile?.id || "",
        contract_template_id: templateId || undefined,
        contract_body: trimmedBody,
        contract_body_format: format,
        commission_rate: Number(commissionRate || 0),
        valid_from: validFrom,
        valid_until: validUntil,
      });
    },
    onSuccess: (result) => {
      const contract = result?.contract;
      if (result?.status === "draft" && contract) {
        setDraftContract(contract);
        setBuilderOpen(true);
        return;
      }
      const nextAgencySignUrl = contract?.agency_sign_url;
      if (nextAgencySignUrl) {
        setAgencySignUrl(nextAgencySignUrl);
        setAgencySignOpen(true);
        setDraftContract(contract || null);
        return;
      }
      onSuccess?.(contract);
      onClose();
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!draftContract?.id) {
        throw new Error("Missing contract draft");
      }
      return await finalizeMarketplaceCreatorContract(draftContract.id);
    },
    onSuccess: (result) => {
      const contract = result?.contract;
      setBuilderOpen(false);
      setDraftContract(contract || null);
      const nextAgencySignUrl = contract?.agency_sign_url;
      if (nextAgencySignUrl) {
        setAgencySignUrl(nextAgencySignUrl);
        setAgencySignOpen(true);
        return;
      }
      onSuccess?.(contract);
      onClose();
    },
    onError: (error) => {
      setValidationError((error as Error).message);
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Connect {profile?.display_name} with contract
            </DialogTitle>
            <DialogDescription>
              Capture the locked commercial terms first, then send the generated
              contract for signature.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contract template</Label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="" disabled>
                    Select template
                  </option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.template_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Commission rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Valid from</Label>
                <Input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Valid until</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-900">
              Required placeholders: {REQUIRED_VARIABLES.join(", ")}
            </div>

            <ContractEditor
              body={body}
              format={format}
              onChangeBody={setBody}
              onChangeFormat={setFormat}
              variables={REQUIRED_VARIABLES}
              placeholder="Write or customize the connection contract..."
            />

            {validationError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {validationError}
              </div>
            ) : null}

            {createMutation.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {(createMutation.error as Error).message}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setValidationError("");
                const missing = REQUIRED_VARIABLES.filter(
                  (placeholder) => !body.includes(placeholder),
                );
                if (missing.length > 0) {
                  setValidationError(
                    `Missing required placeholders: ${missing.join(", ")}`,
                  );
                  return;
                }
                await createMutation.mutateAsync();
              }}
              disabled={createMutation.isPending || !profile?.id}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing contract
                </>
              ) : (
                <>
                  Continue to DocuSeal
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {draftContract ? (
        <DocuSealBuilderModal
          open={builderOpen}
          onClose={() => setBuilderOpen(false)}
          templateName={
            draftContract.template_name ||
            `${profile?.display_name || "Creator"} Contract`
          }
          docusealTemplateId={draftContract.docuseal_template_id || undefined}
          externalId={`marketplace-contract-${draftContract.id}`}
          contractBody={body}
          builderRoles={["First Party", "Second Party"]}
          onSave={() => {
            // DocuSeal persists builder changes directly to the template.
          }}
          onSend={() => {
            setValidationError("");
            finalizeMutation.mutate();
          }}
          isSending={finalizeMutation.isPending}
        />
      ) : null}

      <Dialog
        open={agencySignOpen}
        onOpenChange={(next) => {
          if (!next) {
            setAgencySignOpen(false);
            onSuccess?.(draftContract || undefined);
            onClose();
          }
        }}
      >
        <DialogContent className="fixed !inset-0 bg-background w-screen h-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none border-none p-0 flex flex-col outline-none">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Agency Signature</DialogTitle>
            <DialogDescription>
              Complete your signature to release this contract to the creator.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full bg-gray-50 overflow-hidden flex flex-col">
            <div className="px-6 py-3 border-b border-gray-200 bg-white shadow-sm flex items-center justify-between shrink-0">
              <div className="text-xs sm:text-sm text-gray-700 font-medium flex items-center gap-4">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  Party mapping:
                </span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-100 px-3 py-1 text-xs font-bold">
                    First Party = Agency
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 text-xs font-bold">
                    Second Party = Creator
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {agencySignUrl ? (
                <DocusealForm
                  src={agencySignUrl}
                  onComplete={async () => {
                    if (draftContract?.id) {
                      try {
                        await syncMarketplaceContract(draftContract.id);
                      } catch {
                        // ignore transient sync issues; polling will catch up
                      }
                    }
                    setAgencySignOpen(false);
                    onSuccess?.(draftContract || undefined);
                    onClose();
                  }}
                  onDecline={async () => {
                    if (draftContract?.id) {
                      try {
                        await syncMarketplaceContract(draftContract.id);
                      } catch {
                        // ignore transient sync issues
                      }
                    }
                    setAgencySignOpen(false);
                    onClose();
                  }}
                />
              ) : null}
            </div>
          </div>
          <DialogFooter className="p-4 border-t">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setAgencySignOpen(false);
                onSuccess?.(draftContract || undefined);
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
}

export default MarketplaceConnectContractModal;
