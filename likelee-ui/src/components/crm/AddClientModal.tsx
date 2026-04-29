import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import * as crmApi from "@/api/crm";
import { parseBackendError } from "@/utils/errorParser";
import { useTranslation } from "react-i18next";

const INDUSTRY_OPTIONS = [
  "Fashion",
  "Technology",
  "Media",
  "Retail",
  "Healthcare",
  "Finance",
  "Entertainment",
  "Automotive",
  "Real Estate",
  "Education",
];

const TAG_OPTIONS = [
  "High Budget",
  "VIP",
  "Long-term",
  "New",
  "Referral",
  "Urgent",
  "Local",
  "International",
  "Corporate",
  "Start-up",
];

const AddClientModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation("agency");
  const [formData, setFormData] = useState({
    company: "",
    industry: "",
    website: "",
    status: "Lead",
    tags: "",
    notes: "",
    next_follow_up_date: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => crmApi.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-clients"] });
      toast({
        title: t("agencyDashboard.clientCRM.toasts.successTitle"),
        description: t(
          "agencyDashboard.clientCRM.modal.addClient.toasts.created",
        ),
      });
      onClose();
      setFormData({
        company: "",
        industry: "",
        website: "",
        status: "Lead",
        tags: "",
        notes: "",
        next_follow_up_date: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("agencyDashboard.clientCRM.toasts.errorTitle"),
        description:
          parseBackendError(error) ||
          t("agencyDashboard.clientCRM.modal.addClient.toasts.failed"),
        variant: "destructive",
      });
    },
  });

  const toggleTag = (tag: string) => {
    const currentTags = formData.tags
      ? formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    if (currentTags.includes(tag)) {
      setFormData({
        ...formData,
        tags: currentTags.filter((t) => t !== tag).join(", "),
      });
    } else {
      setFormData({
        ...formData,
        tags: [...currentTags, tag].join(", "),
      });
    }
  };

  const handleSubmit = () => {
    if (!formData.company) {
      toast({
        title: t("agencyDashboard.clientCRM.toasts.errorTitle"),
        description: t(
          "agencyDashboard.clientCRM.modal.addClient.errors.companyRequired",
        ),
        variant: "destructive",
      });
      return;
    }
    mutation.mutate({
      ...formData,
      tags: formData.tags
        ? formData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      next_follow_up_date: formData.next_follow_up_date || null,
      preferences: { notes: formData.notes },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-none">
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {t("agencyDashboard.clientCRM.modal.addClient.title")}
            </DialogTitle>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">
                {t(
                  "agencyDashboard.clientCRM.modal.addClient.fields.companyName",
                )}
              </Label>
              <Input
                placeholder={t(
                  "agencyDashboard.clientCRM.modal.addClient.placeholders.companyName",
                )}
                className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">
                {t("agencyDashboard.clientCRM.modal.addClient.fields.industry")}
              </Label>
              <Select
                value={formData.industry}
                onValueChange={(val) =>
                  setFormData({ ...formData, industry: val })
                }
              >
                <SelectTrigger className="h-11 bg-gray-50 border-gray-200 rounded-xl">
                  <SelectValue
                    placeholder={t(
                      "agencyDashboard.clientCRM.modal.addClient.placeholders.selectIndustry",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {t(`agencyDashboard.clientCRM.industries.${ind}`, {
                        defaultValue: ind,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-700">
              {t("agencyDashboard.clientCRM.modal.addClient.fields.website")}
            </Label>
            <Input
              placeholder={t(
                "agencyDashboard.clientCRM.modal.addClient.placeholders.website",
              )}
              className="h-11 bg-gray-50 border-gray-200 rounded-xl"
              value={formData.website}
              onChange={(e) =>
                setFormData({ ...formData, website: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-700">
              {t(
                "agencyDashboard.clientCRM.modal.addClient.fields.pipelineStage",
              )}
            </Label>
            <Select
              value={formData.status}
              onValueChange={(val) => setFormData({ ...formData, status: val })}
            >
              <SelectTrigger className="h-11 bg-gray-50 border-gray-200 rounded-xl">
                <SelectValue
                  placeholder={t(
                    "agencyDashboard.clientCRM.modal.addClient.placeholders.selectStage",
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lead">
                  {t("agencyDashboard.clientCRM.status.lead")}
                </SelectItem>
                <SelectItem value="Prospect">
                  {t("agencyDashboard.clientCRM.status.prospect")}
                </SelectItem>
                <SelectItem value="Active Client">
                  {t("agencyDashboard.clientCRM.status.activeClient")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold text-gray-700">
              {t("agencyDashboard.clientCRM.modal.addClient.fields.tags")}
            </Label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => {
                const isSelected = formData.tags
                  .split(",")
                  .map((t) => t.trim())
                  .includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      isSelected
                        ? "bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {t(`agencyDashboard.clientCRM.tags.${tag}`, {
                      defaultValue: tag,
                    })}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-700">
              {t(
                "agencyDashboard.clientCRM.modal.addClient.fields.nextFollowUp",
              )}
            </Label>
            <Input
              type="date"
              className="h-11 bg-gray-50 border-gray-200 rounded-xl"
              value={formData.next_follow_up_date}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  next_follow_up_date: e.target.value,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-700">
              {t("agencyDashboard.clientCRM.modal.addClient.fields.notes")}
            </Label>
            <Textarea
              placeholder={t(
                "agencyDashboard.clientCRM.modal.addClient.placeholders.notes",
              )}
              className="min-h-[100px] bg-gray-50 border-gray-200 rounded-xl resize-none"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-11 px-8 rounded-xl border-gray-200 font-bold"
            >
              {t("agencyDashboard.clientCRM.actions.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
            >
              {mutation.isPending
                ? t("agencyDashboard.clientCRM.modal.addClient.actions.adding")
                : t("agencyDashboard.clientCRM.actions.addClient")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientModal;
