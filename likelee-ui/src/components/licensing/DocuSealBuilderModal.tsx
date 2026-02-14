import React, { useEffect, useState } from "react";
import { DocusealBuilder } from "@docuseal/react";
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
  onSave: (docusealTemplateId: number) => void;
  onSend?: () => void;
  isSending?: boolean;
}

export const DocuSealBuilderModal: React.FC<DocuSealBuilderModalProps> = ({
  open,
  onClose,
  templateName,
  docusealTemplateId,
  externalId,
  contractBody,
  onSave,
  onSend,
  isSending,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [prefillValues, setPrefillValues] = useState<any>(null);
  const [docusealUserEmail, setDocusealUserEmail] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  console.log("DocuSeal Designer [Render]:", {
    hasToken: !!token,
    fieldsCount: prefillFields?.length,
    prefillFields,
  });

  useEffect(() => {
    if (open) {
      setLoading(true);
      const name = templateName || "License Contract";
      createBuilderToken(name, docusealTemplateId, externalId, contractBody)
        .then((res) => {
          console.log("DocuSeal Token Response:", res);
          setToken(res.token);
          setPrefillValues(res.values);
          setDocusealUserEmail(res.docuseal_user_email);
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
    }
  }, [
    open,
    templateName,
    docusealTemplateId,
    externalId,
    contractBody,
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
                onClick={onSend}
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

        <div className="flex-1 w-full relative bg-slate-50 flex overflow-hidden">
          <div className="flex-1 relative h-full">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : token ? (
              <DocusealBuilder
                token={token}
                fields={prefillFields}
                roles={["First Party"]}
                withFieldPlaceholder={true}
                withSendButton={false}
                withSignYourselfButton={false}
                onSave={(data: any) => {
                  console.log("Designer Save Clicked:", data);

                  // Check if there are any fields defined
                  const hasFields = data?.documents?.some(
                    (doc: any) => doc.fields && doc.fields.length > 0,
                  );

                  if (data?.id && hasFields) {
                    onSave(data.id);
                    toast({
                      title: "Layout Saved",
                      description:
                        "The document layout has been updated and sent.",
                    });
                  } else if (data?.id && !hasFields) {
                    console.log(
                      "ignoring save with no fields (likely just upload)",
                    );
                  }
                }}
                className="w-full h-full"
              />
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
