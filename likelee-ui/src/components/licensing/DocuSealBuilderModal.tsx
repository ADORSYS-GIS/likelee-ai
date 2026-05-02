import React, { useEffect, useState, useMemo, useCallback } from "react";
import { DocusealBuilder, DocusealBuilderSubmitter, DocusealBuilderField } from "@docuseal/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createBuilderToken } from "@/api/licenseTemplates";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { getFriendlyErrorMessage } from "@/utils/errorUtils";

interface DocuSealBuilderModalProps {
  open: boolean;
  onClose: () => void;
  templateName: string;
  docusealTemplateId?: number;
  externalId?: string;
  contractBody?: string;
  builderRoles?: string[];
  onSave: (docusealTemplateId: number) => void;
  onSend?: () => void;
  isSending?: boolean;
  firstPartyName?: string;
  firstPartyEmail?: string;
  secondPartyName?: string;
  secondPartyEmail?: string;
}

export const DocuSealBuilderModal: React.FC<DocuSealBuilderModalProps> = ({
  open,
  onClose,
  templateName,
  docusealTemplateId,
  externalId,
  contractBody,
  builderRoles,
  onSave,
  onSend,
  isSending,
  firstPartyName,
  firstPartyEmail,
  secondPartyName,
  secondPartyEmail,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [prefillValues, setPrefillValues] = useState<any>(null);
  const [docusealUserEmail, setDocusealUserEmail] = useState<string | null>(
    null,
  );
  const [returnedSubmitters, setReturnedSubmitters] = useState<DocusealBuilderSubmitter[]>([]);
  const [returnedFields, setReturnedFields] = useState<DocusealBuilderField[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedTemplateId, setSavedTemplateId] = useState<number | null>(null);
  const { toast } = useToast();
  const hasSecondPartyRole = React.useMemo(
    () =>
      Array.isArray(builderRoles) &&
      builderRoles.some((role) => role.toLowerCase().trim() === "second party"),
    [builderRoles],
  );

  const prefillFields = React.useMemo(() => {
    if (!prefillValues || typeof prefillValues !== "object") return undefined;

    const fields: any[] = [];
    const roleData = prefillValues["First Party"] || prefillValues;

    const slugify = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

    const addField = (name: string, val: any) => {
      const valStr = String(val);
      // 1. Original format
      fields.push({
        name,
        role: "First Party",
        value: valStr,
        default_value: valStr,
      });

      // 2. Slugified format (Internal DocuSeal standard)
      const slug = slugify(name);
      if (slug !== name) {
        fields.push({
          name: slug,
          role: "First Party",
          value: valStr,
          default_value: valStr,
        });
      }
    };

    Object.entries(roleData).forEach(([key, value]) => {
      if (typeof value === "string" || typeof value === "number") {
        addField(key, value);
      }
    });

    return fields.length > 0 ? fields : undefined;
  }, [prefillValues]);

  const builderSubmitters = useMemo((): DocusealBuilderSubmitter[] => {
    if (returnedSubmitters.length > 0) {
      return returnedSubmitters;
    }
    const submitters: DocusealBuilderSubmitter[] = [];
    submitters.push({
      role: "First Party",
      name: firstPartyName,
      email: firstPartyEmail,
    });
    if (hasSecondPartyRole) {
      submitters.push({
        role: "Second Party",
        name: secondPartyName,
        email: secondPartyEmail,
      });
    }
    return submitters;
  }, [returnedSubmitters, firstPartyName, firstPartyEmail, hasSecondPartyRole, secondPartyName, secondPartyEmail]);

  const builderFields = useMemo((): DocusealBuilderField[] => {
    if (returnedFields.length > 0) {
      return returnedFields;
    }
    const fields: DocusealBuilderField[] = [];
    if (firstPartyName) {
      fields.push({
        name: "Agency Name",
        role: "First Party",
        type: "text",
        default_value: firstPartyName,
        readonly: true,
      });
    }
    if (firstPartyEmail) {
      fields.push({
        name: "Agency Email",
        role: "First Party",
        type: "text",
        default_value: firstPartyEmail,
        readonly: true,
      });
    }
    fields.push({
      name: "Agency Date",
      role: "First Party",
      type: "date",
      readonly: true,
    });
    fields.push({
      name: "Agency Signature",
      role: "First Party",
      type: "signature",
      required: true,
    });
    if (hasSecondPartyRole) {
      if (secondPartyName) {
        fields.push({
          name: "Client Name",
          role: "Second Party",
          type: "text",
          default_value: secondPartyName,
          readonly: true,
        });
      }
      if (secondPartyEmail) {
        fields.push({
          name: "Client Email",
          role: "Second Party",
          type: "text",
          default_value: secondPartyEmail,
          readonly: true,
        });
      }
      fields.push({
        name: "Client Date",
        role: "Second Party",
        type: "date",
        readonly: true,
      });
      fields.push({
        name: "Client Signature",
        role: "Second Party",
        type: "signature",
        required: true,
      });
    }
    return fields;
  }, [returnedFields, firstPartyName, firstPartyEmail, hasSecondPartyRole, secondPartyName, secondPartyEmail]);

  const handleBuilderLoad = useCallback((detail: any) => {
    console.log("DocuSeal Builder onLoad:", detail);
    if (detail?.id || detail?.template_id) {
      setSavedTemplateId(detail.id || detail.template_id);
    }
  }, []);

  const handleBuilderChange = useCallback((detail: any) => {
    console.log("DocuSeal Builder onChange:", detail);
    if (detail?.id || detail?.template_id) {
      setSavedTemplateId(detail.id || detail.template_id);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      const name = templateName || "License Contract";
      createBuilderToken(
        name,
        docusealTemplateId,
        externalId,
        contractBody,
        builderRoles,
      )
        .then((res) => {
          console.log("DocuSeal Token Response:", res);
          setToken(res.token);
          setPrefillValues(res.values);
          setDocusealUserEmail(res.docuseal_user_email);
          if (res.submitters && Array.isArray(res.submitters)) {
            setReturnedSubmitters(res.submitters);
          }
          if (res.fields && Array.isArray(res.fields)) {
            setReturnedFields(res.fields);
          }
          if (res.template_id) {
            setSavedTemplateId(res.template_id);
          }
        })
        .catch((err) => {
          toast({
            title: "Error",
            description: getFriendlyErrorMessage(err),
            variant: "destructive",
          });
          onClose();
        })
        .finally(() => setLoading(false));
    } else {
      setToken(null);
      setPrefillValues(null);
      setDocusealUserEmail(null);
      setReturnedSubmitters([]);
      setReturnedFields([]);
      setSavedTemplateId(null);
    }
  }, [
    open,
    templateName,
    docusealTemplateId,
    externalId,
    contractBody,
    builderRoles,
    onClose,
    toast,
  ]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-7xl h-[92vh] p-0 border-none bg-white rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300">
        <DialogTitle className="sr-only">Document Designer</DialogTitle>
        <DialogDescription className="sr-only">
          Design your contract template by uploading a PDF and adding signature
          fields
        </DialogDescription>

        {/* Modal Header */}
        <div className="bg-white px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 leading-tight">
              Edit Template
            </h2>
            <p className="text-slate-500 font-medium">
              {templateName || "License Contract"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onSend && (
              <Button
                onClick={() => {
                  onSend();
                }}
                disabled={isSending || !token}
                className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-indigo-200"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Finalize & Send"
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        <div className="flex-1 w-full relative bg-slate-50 flex overflow-hidden flex-col">
          {hasSecondPartyRole && (
            <div className="px-8 py-3 border-b border-slate-200 bg-white">
              <div className="text-xs sm:text-sm text-slate-700 font-medium">
                Party mapping:
                <span className="ml-2 inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-100 px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
                  First Party = Agency
                </span>
                <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
                  Second Party = Client
                </span>
              </div>
            </div>
          )}
          <div className="flex-1 relative h-full">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : token ? (
              <DocusealBuilder
                token={token}
                fields={builderFields.length > 0 ? builderFields : prefillFields}
                submitters={builderSubmitters.length > 0 ? builderSubmitters : undefined}
                roles={
                  builderRoles && builderRoles.length
                    ? builderRoles
                    : ["First Party"]
                }
                withFieldPlaceholder={true}
                withSendButton={false}
                withSignYourselfButton={false}
                className="w-full h-full"
                onChange={handleBuilderChange}
                onLoad={handleBuilderLoad}
              />
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
