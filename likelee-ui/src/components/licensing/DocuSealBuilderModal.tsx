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

interface DocuSealBuilderModalProps {
  open: boolean;
  onClose: () => void;
  templateName: string;
  docusealTemplateId?: number;
  externalId?: string;
  onSave: (docusealTemplateId: number) => void;
}

export const DocuSealBuilderModal: React.FC<DocuSealBuilderModalProps> = ({
  open,
  onClose,
  templateName,
  docusealTemplateId,
  externalId,
  onSave,
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
      createBuilderToken(name, docusealTemplateId, externalId)
        .then((res) => {
          console.log("DocuSeal Token Response:", res);
          setToken(res.token);
          setPrefillValues(res.values);
          setDocusealUserEmail(res.docuseal_user_email);
        })
        .catch((err) => {
          toast({
            title: "Error",
            description:
              "Failed to initialize DocuSeal builder: " + err.message,
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
  }, [open, templateName, docusealTemplateId, externalId, onClose, toast]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="fixed !inset-0 !z-[9999] bg-background w-screen h-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none border-none !pt-20 p-0 flex flex-col outline-none">
        <DialogTitle className="sr-only">Document Designer</DialogTitle>
        <DialogDescription className="sr-only">
          Design your contract template by uploading a PDF and adding signature
          fields
        </DialogDescription>
        <div className="flex-1 w-full h-full relative bg-gray-50 flex overflow-hidden">
          <div className="flex-1 relative h-full">
            {/* Floating Close Button for mobile/tablet where sidebar is hidden */}
            <div className="absolute top-4 right-4 z-50 lg:hidden">
              <Button variant="destructive" size="sm" onClick={onClose}>
                Close Designer
              </Button>
            </div>

            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : token ? (
              <DocusealBuilder
                token={token}
                fields={prefillFields}
                roles={["First Party"]}
                inputMode={true}
                withFieldPlaceholder={true}
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
