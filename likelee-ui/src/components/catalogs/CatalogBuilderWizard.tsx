import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Image as ImageIcon,
  Mic,
  Send,
  Users,
  UploadCloud,
  Play,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { catalogApi } from "@/api/catalogs";

type Step = "info" | "select-request" | "assets" | "voice" | "review";

const STEPS: { id: Step; label: string }[] = [
  { id: "select-request", label: "Source" },
  { id: "info", label: "Details" },
  { id: "assets", label: "Assets" },
  { id: "voice", label: "Voice" },
  { id: "review", label: "Send" },
];

type CatalogItem = {
  talent_id: string;
  talent_name: string;
  asset_ids: { asset_id: string; asset_type: string }[];
  recording_ids: { recording_id: string; emotion_tag?: string }[];
};

type FormState = {
  title: string;
  client_name: string;
  client_email: string;
  notes: string;
  licensing_request_id: string;
  expires_at: string;
  items: Record<string, CatalogItem>; // keyed by talent_id
};

export function CatalogBuilderWizard({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t: baseT } = useTranslation("agency");
  const t = (key: string, options?: Record<string, unknown>) => {
    const aliases: Record<string, string> = {
      "agencyDashboard.catalogs.wizard.steps.source":
        "agencyDashboard.catalogs.builder.steps.selectRequest",
      "agencyDashboard.catalogs.wizard.steps.details":
        "agencyDashboard.catalogs.builder.steps.info",
      "agencyDashboard.catalogs.wizard.steps.assets":
        "agencyDashboard.catalogs.builder.steps.assets",
      "agencyDashboard.catalogs.wizard.steps.voice":
        "agencyDashboard.catalogs.builder.steps.voice",
      "agencyDashboard.catalogs.wizard.steps.send":
        "agencyDashboard.catalogs.builder.steps.review",
      "agencyDashboard.catalogs.wizard.title":
        "agencyDashboard.catalogs.builder.title",
      "agencyDashboard.catalogs.wizard.description":
        "agencyDashboard.catalogs.builder.description",
      "agencyDashboard.catalogs.wizard.info.catalogTitle":
        "agencyDashboard.catalogs.builder.fields.catalogTitle",
      "agencyDashboard.catalogs.wizard.info.catalogTitlePlaceholder":
        "agencyDashboard.catalogs.builder.placeholders.catalogTitleDetailed",
      "agencyDashboard.catalogs.wizard.info.notes":
        "agencyDashboard.catalogs.builder.fields.notesOptional",
      "agencyDashboard.catalogs.wizard.info.notesPlaceholder":
        "agencyDashboard.catalogs.builder.placeholders.notesDetailed",
      "agencyDashboard.catalogs.wizard.info.catalogExpiration":
        "agencyDashboard.catalogs.builder.fields.catalogExpiration",
      "agencyDashboard.catalogs.wizard.info.expirationHelp":
        "agencyDashboard.catalogs.builder.expirationHelpDetailed",
      "agencyDashboard.catalogs.wizard.selectRequest.description":
        "agencyDashboard.catalogs.builder.selectRequestDescriptionDetailed",
      "agencyDashboard.catalogs.wizard.selectRequest.noRequests":
        "agencyDashboard.catalogs.builder.empty.noSignedRequestsDetailed",
      "agencyDashboard.catalogs.wizard.selectRequest.unnamedClient":
        "agencyDashboard.catalogs.builder.empty.unnamedClient",
      "agencyDashboard.catalogs.wizard.selectRequest.contractSigned":
        "agencyDashboard.catalogs.builder.selectRequestEligibleDetailed",
      "agencyDashboard.catalogs.wizard.selectRequest.paidOn":
        "agencyDashboard.catalogs.wizard.selectRequest.paidOn",
      "agencyDashboard.catalogs.wizard.selectRequest.unpaidWarning":
        "agencyDashboard.catalogs.builder.unpaidRequestHelpDetailed",
      "agencyDashboard.catalogs.wizard.assets.loading":
        "agencyDashboard.catalogs.builder.loadingAssets",
      "agencyDashboard.catalogs.wizard.assets.noTalents":
        "agencyDashboard.catalogs.builder.empty.noTalentsAssetsDetailed",
      "agencyDashboard.catalogs.wizard.assets.selected":
        "agencyDashboard.catalogs.builder.selectedCount",
      "agencyDashboard.catalogs.wizard.assets.noAssets":
        "agencyDashboard.catalogs.builder.empty.noAssetsForTalentDetailed",
      "agencyDashboard.catalogs.wizard.assets.upload":
        "agencyDashboard.catalogs.builder.actions.upload",
      "agencyDashboard.catalogs.wizard.voice.noTalents":
        "agencyDashboard.catalogs.builder.empty.noTalentsVoiceDetailed",
      "agencyDashboard.catalogs.wizard.voice.selected":
        "agencyDashboard.catalogs.builder.selectedCount",
      "agencyDashboard.catalogs.wizard.voice.uploadNew":
        "agencyDashboard.catalogs.builder.actions.uploadNewRecording",
      "agencyDashboard.catalogs.wizard.voice.recording":
        "agencyDashboard.catalogs.builder.defaults.recording",
      "agencyDashboard.catalogs.wizard.review.title":
        "agencyDashboard.catalogs.preview.fields.title",
      "agencyDashboard.catalogs.wizard.review.client":
        "agencyDashboard.catalogs.preview.fields.client",
      "agencyDashboard.catalogs.wizard.review.sendTo":
        "agencyDashboard.catalogs.builder.review.sendTo",
      "agencyDashboard.catalogs.wizard.review.talents":
        "agencyDashboard.catalogs.builder.review.talents",
      "agencyDashboard.catalogs.wizard.review.assets":
        "agencyDashboard.catalogs.preview.fields.assets",
      "agencyDashboard.catalogs.wizard.review.recordings":
        "agencyDashboard.catalogs.builder.review.recordings",
      "agencyDashboard.catalogs.wizard.review.linkedRequest":
        "agencyDashboard.catalogs.builder.review.linkedRequest",
      "agencyDashboard.catalogs.wizard.review.yes":
        "agencyDashboard.catalogs.builder.review.yes",
      "agencyDashboard.catalogs.wizard.review.no":
        "agencyDashboard.catalogs.builder.review.no",
      "agencyDashboard.catalogs.wizard.review.emailNotice":
        "agencyDashboard.catalogs.builder.review.emailNotice",
      "agencyDashboard.catalogs.wizard.review.noEmailWarning":
        "agencyDashboard.catalogs.builder.review.noClientEmail",
      "agencyDashboard.catalogs.wizard.actions.cancel":
        "agencyDashboard.catalogs.actions.cancel",
      "agencyDashboard.catalogs.wizard.actions.back":
        "agencyDashboard.catalogs.builder.actions.back",
      "agencyDashboard.catalogs.wizard.actions.next":
        "agencyDashboard.catalogs.builder.actions.next",
      "agencyDashboard.catalogs.wizard.actions.creating":
        "agencyDashboard.catalogs.builder.actions.creating",
      "agencyDashboard.catalogs.wizard.actions.createAndSend":
        "agencyDashboard.catalogs.builder.actions.createAndSend",
      "agencyDashboard.catalogs.toasts.assetUploaded":
        "agencyDashboard.catalogs.builder.toasts.assetUploaded",
      "agencyDashboard.catalogs.toasts.recordingUploaded":
        "agencyDashboard.catalogs.builder.toasts.recordingUploaded",
      "agencyDashboard.catalogs.toasts.catalogCreated":
        "agencyDashboard.catalogs.builder.toasts.catalogCreated",
      "agencyDashboard.catalogs.toasts.catalogSentTo":
        "agencyDashboard.catalogs.builder.toasts.catalogSentTo",
      "agencyDashboard.catalogs.toasts.catalogCreatedCopyLink":
        "agencyDashboard.catalogs.builder.toasts.catalogCreatedShare",
      "agencyDashboard.catalogs.toasts.failedToCreateCatalog":
        "agencyDashboard.catalogs.builder.toasts.createFailed",
    };
    if (
      key === "agencyDashboard.catalogs.wizard.assets.selected" ||
      key === "agencyDashboard.catalogs.wizard.voice.selected"
    ) {
      return baseT(key, { defaultValue: "selected", ...options });
    }
    if (key === "agencyDashboard.catalogs.wizard.selectRequest.paidOn") {
      return baseT(key, { defaultValue: "Paid on", ...options });
    }
    return baseT(aliases[key] || key, options);
  };
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("select-request");
  const STEPS_TRANSLATED = [
    {
      id: "select-request" as Step,
      label: t("agencyDashboard.catalogs.wizard.steps.source"),
    },
    {
      id: "info" as Step,
      label: t("agencyDashboard.catalogs.wizard.steps.details"),
    },
    {
      id: "assets" as Step,
      label: t("agencyDashboard.catalogs.wizard.steps.assets"),
    },
    {
      id: "voice" as Step,
      label: t("agencyDashboard.catalogs.wizard.steps.voice"),
    },
    {
      id: "review" as Step,
      label: t("agencyDashboard.catalogs.wizard.steps.send"),
    },
  ];
  const [sourceId, setSourceId] = useState<string>("");
  const [form, setForm] = useState<FormState>({
    title: "",
    client_name: "",
    client_email: "",
    licensing_request_id: "",
    expires_at: "",
    notes: "",
    items: {},
  });

  // Selected talents for this catalog (pulled from eligible request or free selection)
  const [selectedTalents, setSelectedTalents] = useState<
    { id: string; name: string }[]
  >([]);

  const eligibleQuery = useQuery({
    queryKey: ["catalog-eligible-requests"],
    queryFn: async () => {
      const res = await catalogApi.eligibleRequests();
      return (res as any)?.data ?? res ?? [];
    },
    enabled: open,
  });

  const eligibleRequests: any[] = Array.isArray(eligibleQuery.data)
    ? eligibleQuery.data
    : [];

  // ------------------------------- Assets per talent -------------------------
  const [talentAssets, setTalentAssets] = useState<Record<string, any[]>>({});
  const [talentRecordings, setTalentRecordings] = useState<
    Record<string, any[]>
  >({});
  const [loadingAssets, setLoadingAssets] = useState(false);

  const loadTalentData = async (talents: { id: string; name: string }[]) => {
    setLoadingAssets(true);
    const assetsMap: Record<string, any[]> = {};
    const recMap: Record<string, any[]> = {};

    await Promise.all(
      talents.map(async (t) => {
        try {
          const [aRes, rRes] = await Promise.all([
            catalogApi.getTalentAssets(t.id),
            catalogApi.getTalentRecordings(t.id),
          ]);
          let assets = (aRes as any)?.data ?? aRes ?? [];
          let recs = (rRes as any)?.data ?? rRes ?? [];

          // Fetch signed URLs for recordings if they don't have a direct URL
          recs = await Promise.all(
            recs.map(async (rec: any) => {
              if (rec.storage_path && !rec.url) {
                try {
                  const sRes = await catalogApi.getSignedRecordingUrl(rec.id);
                  rec.url = (sRes as any)?.url ?? rec.url;
                } catch (e) {
                  // ignore
                }
              }
              return rec;
            }),
          );

          assetsMap[t.id] = assets;
          recMap[t.id] = recs;
        } catch {
          assetsMap[t.id] = [];
          recMap[t.id] = [];
        }
      }),
    );

    setTalentAssets(assetsMap);
    setTalentRecordings(recMap);
    setLoadingAssets(false);
  };

  // -------------------------------- Uploads ----------------------------------
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const handleUploadAsset = async (
    talentId: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploadingFor(talentId);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        await catalogApi.uploadTalentAsset(talentId, formData);
      }
      // Reload assets just for this talent after all uploads finish
      const res = await catalogApi.getTalentAssets(talentId);
      setTalentAssets((prev) => ({
        ...prev,
        [talentId]: (res as any)?.data ?? res ?? [],
      }));
      toast({ title: t("agencyDashboard.catalogs.toasts.assetUploaded") });
    } catch (e: any) {
      toast({
        title: t("agencyDashboard.catalogs.builder.toasts.uploadFailed"),
        description:
          e.message ||
          t("agencyDashboard.catalogs.builder.toasts.genericError"),
        variant: "destructive",
      });
    } finally {
      setUploadingFor(null);
    }
  };

  const handleUploadRecording = async (
    talentId: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploadingFor(talentId);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("talent_id", talentId);
        formData.append("emotion_tag", "demo"); // Default tag
        formData.append("accessible", "true");

        await catalogApi.uploadTalentRecording(formData);
      }
      // Reload recordings just for this talent
      const res = await catalogApi.getTalentRecordings(talentId);
      let recs = (res as any)?.data ?? res ?? [];
      recs = await Promise.all(
        recs.map(async (rec: any) => {
          if (rec.storage_path && !rec.url) {
            try {
              const sRes = await catalogApi.getSignedRecordingUrl(rec.id);
              rec.url = (sRes as any)?.url ?? rec.url;
            } catch (e) {
              // ignore
            }
          }
          return rec;
        }),
      );
      setTalentRecordings((prev) => ({
        ...prev,
        [talentId]: recs,
      }));
      toast({ title: t("agencyDashboard.catalogs.toasts.recordingUploaded") });
    } catch (e: any) {
      toast({
        title: t("agencyDashboard.catalogs.builder.toasts.uploadFailed"),
        description:
          e.message ||
          t("agencyDashboard.catalogs.builder.toasts.genericError"),
        variant: "destructive",
      });
    } finally {
      setUploadingFor(null);
    }
  };

  // -------------------------------- Mutations --------------------------------
  const createMutation = useMutation({
    mutationFn: (data: any) => catalogApi.create(data),
    onSuccess: (res: any) => {
      const email = form.client_email.trim();
      toast({
        title: t("agencyDashboard.catalogs.toasts.catalogCreated"),
        description: email
          ? t("agencyDashboard.catalogs.toasts.catalogSentTo", { email })
          : t("agencyDashboard.catalogs.toasts.catalogCreatedCopyLink"),
      });
      onCreated();
    },
    onError: (e: any) => {
      toast({
        title: t("agencyDashboard.catalogs.toasts.failedToCreateCatalog"),
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    },
  });

  // -------------------------------- Helpers ----------------------------------
  const toggleAsset = (
    talentId: string,
    assetId: string,
    assetType: string,
  ) => {
    setForm((prev) => {
      const item = prev.items[talentId] ?? {
        talent_id: talentId,
        talent_name: selectedTalents.find((t) => t.id === talentId)?.name ?? "",
        asset_ids: [],
        recording_ids: [],
      };
      const exists = item.asset_ids.some((a) => a.asset_id === assetId);
      const updated: CatalogItem = {
        ...item,
        asset_ids: exists
          ? item.asset_ids.filter((a) => a.asset_id !== assetId)
          : [...item.asset_ids, { asset_id: assetId, asset_type: assetType }],
      };
      return { ...prev, items: { ...prev.items, [talentId]: updated } };
    });
  };

  const toggleRecording = (
    talentId: string,
    recordingId: string,
    emotionTag?: string,
  ) => {
    setForm((prev) => {
      const item = prev.items[talentId] ?? {
        talent_id: talentId,
        talent_name: selectedTalents.find((t) => t.id === talentId)?.name ?? "",
        asset_ids: [],
        recording_ids: [],
      };
      const exists = item.recording_ids.some(
        (r) => r.recording_id === recordingId,
      );
      const updated: CatalogItem = {
        ...item,
        recording_ids: exists
          ? item.recording_ids.filter((r) => r.recording_id !== recordingId)
          : [
              ...item.recording_ids,
              { recording_id: recordingId, emotion_tag: emotionTag },
            ],
      };
      return { ...prev, items: { ...prev.items, [talentId]: updated } };
    });
  };

  const selectRequest = (req: any) => {
    const lrId = req.licensing_request_id ?? "";
    setSourceId(req.id);
    setForm((prev) => ({
      ...prev,
      title:
        prev.title ||
        req.campaign_title ||
        `Catalog – ${req.client_name || ""}`,
      licensing_request_id: lrId,
      client_name: req.client_name || "",
      client_email: req.client_email || "",
    }));

    // Load talents from the enahnced backend response
    if (req.talents && Array.isArray(req.talents) && req.talents.length > 0) {
      setSelectedTalents(req.talents);
    } else {
      // Fallback for older data or missing joined data
      const talent = req.talent_name
        ? [{ id: req.talent_id ?? "", name: req.talent_name }]
        : [];
      setSelectedTalents(talent);
    }
  };

  const handleSubmit = () => {
    const payload = {
      title: form.title,
      client_name: form.client_name || undefined,
      client_email: form.client_email || undefined,
      licensing_request_id: form.licensing_request_id || undefined,
      notes: form.notes || undefined,
      expires_at: form.expires_at
        ? new Date(form.expires_at).toISOString()
        : undefined,
      items: Object.values(form.items),
    };
    createMutation.mutate(payload);
  };

  // -------------------------------- Step nav ---------------------------------
  const stepIndex = STEPS_TRANSLATED.findIndex((s) => s.id === step);
  const goNext = async () => {
    if (step === "select-request") {
      await loadTalentData(selectedTalents);
    }
    const next = STEPS_TRANSLATED[stepIndex + 1];
    if (next) setStep(next.id);
  };
  const goPrev = () => {
    const prev = STEPS_TRANSLATED[stepIndex - 1];
    if (prev) setStep(prev.id);
  };

  const canNext = () => {
    if (step === "info") {
      return form.title.trim().length > 0 && form.expires_at.trim().length > 0;
    }
    return true;
  };

  // -------------------------------- Render -----------------------------------
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-full h-[min(92vh,860px)] rounded-2xl p-0 overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-0">
          <DialogTitle className="text-xl font-bold text-gray-900">
            {t("agencyDashboard.catalogs.wizard.title")}
          </DialogTitle>
          <DialogDescription className="text-gray-500 font-medium">
            {t("agencyDashboard.catalogs.wizard.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="shrink-0 flex items-center gap-1 px-6 pt-4">
          {STEPS_TRANSLATED.map((s, i) => (
            <React.Fragment key={s.id}>
              <div
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  s.id === step
                    ? "text-indigo-700"
                    : i < stepIndex
                      ? "text-green-600"
                      : "text-gray-400"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    s.id === step
                      ? "bg-indigo-600 text-white"
                      : i < stepIndex
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i < stepIndex ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS_TRANSLATED.length - 1 && (
                <div className="flex-1 h-px bg-gray-200 mx-1" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 min-h-0 px-6 py-5 overflow-y-auto">
          {/* ---- Step: Info ---- */}
          {step === "info" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>
                  {t("agencyDashboard.catalogs.wizard.info.catalogTitle")}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder={t(
                    "agencyDashboard.catalogs.wizard.info.catalogTitlePlaceholder",
                  )}
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("agencyDashboard.catalogs.wizard.info.notes")}</Label>
                <Textarea
                  placeholder={t(
                    "agencyDashboard.catalogs.wizard.info.notesPlaceholder",
                  )}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  {t("agencyDashboard.catalogs.wizard.info.catalogExpiration")}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, expires_at: e.target.value }))
                  }
                />
                <p className="text-[10px] text-gray-400">
                  {t("agencyDashboard.catalogs.wizard.info.expirationHelp")}
                </p>
              </div>
            </div>
          )}

          {/* ---- Step: Select Request ---- */}
          {step === "select-request" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 font-medium">
                {t("agencyDashboard.catalogs.wizard.selectRequest.description")}
              </p>
              {eligibleQuery.isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                </div>
              ) : eligibleRequests.length === 0 ? (
                <div className="p-6 border border-dashed border-gray-200 rounded-xl text-center text-sm text-gray-400">
                  {t(
                    "agencyDashboard.catalogs.wizard.selectRequest.noRequests",
                  )}
                </div>
              ) : (
                eligibleRequests.map((req: any) => {
                  const selected = sourceId === req.id;
                  const isPaid =
                    req.is_paid === true ||
                    String(req.payment_status || "").toLowerCase() === "paid";
                  return (
                    <button
                      key={req.id}
                      onClick={() => selectRequest(req)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selected
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {req.client_name ||
                              t(
                                "agencyDashboard.catalogs.wizard.selectRequest.unnamedClient",
                              )}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {req.client_email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {req.total_amount_cents && (
                            <Badge
                              variant="secondary"
                              className={
                                isPaid
                                  ? "bg-green-50 text-green-700"
                                  : "bg-amber-50 text-amber-700"
                              }
                            >
                              ${(req.total_amount_cents / 100).toFixed(2)}{" "}
                              {isPaid
                                ? t("agencyDashboard.catalogs.status.paid")
                                : t("agencyDashboard.catalogs.status.unpaid")}
                            </Badge>
                          )}
                          {!req.total_amount_cents && (
                            <Badge
                              variant="secondary"
                              className={
                                isPaid
                                  ? "bg-green-50 text-green-700"
                                  : "bg-amber-50 text-amber-700"
                              }
                            >
                              {isPaid
                                ? t("agencyDashboard.catalogs.status.paid")
                                : t("agencyDashboard.catalogs.status.unpaid")}
                            </Badge>
                          )}
                          {selected && (
                            <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-1.5 space-y-1">
                        <p className="text-[11px] text-gray-400">
                          {t(
                            "agencyDashboard.catalogs.wizard.selectRequest.contractSigned",
                          )}
                        </p>
                        {req.paid_at ? (
                          <p className="text-[11px] text-green-600">
                            {t(
                              "agencyDashboard.catalogs.wizard.selectRequest.paidOn",
                            )}{" "}
                            {new Date(req.paid_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        ) : (
                          <p className="text-[11px] text-amber-600">
                            {t(
                              "agencyDashboard.catalogs.wizard.selectRequest.unpaidWarning",
                            )}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* ---- Step: Assets ---- */}
          {step === "assets" && (
            <div className="space-y-5">
              {loadingAssets ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  <span className="ml-2 text-sm text-gray-500">
                    {t("agencyDashboard.catalogs.wizard.assets.loading")}
                  </span>
                </div>
              ) : selectedTalents.length === 0 ? (
                <div className="p-6 border border-dashed border-gray-200 rounded-xl text-center text-sm text-gray-400">
                  {t("agencyDashboard.catalogs.wizard.assets.noTalents")}
                </div>
              ) : (
                selectedTalents.map((talent) => {
                  const assets = talentAssets[talent.id] ?? [];
                  const selectedAssets = form.items[talent.id]?.asset_ids ?? [];
                  return (
                    <div key={talent.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        <p className="font-semibold text-gray-900 text-sm">
                          {talent.name}
                        </p>
                        <Badge variant="secondary" className="text-[10px]">
                          {selectedAssets.length}{" "}
                          {t("agencyDashboard.catalogs.wizard.assets.selected")}
                        </Badge>
                      </div>
                      {assets.length === 0 ? (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-400 ml-6">
                            {t(
                              "agencyDashboard.catalogs.wizard.assets.noAssets",
                            )}
                          </p>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              multiple
                              accept="image/*,video/*"
                              className="hidden"
                              onChange={(e) => handleUploadAsset(talent.id, e)}
                              disabled={uploadingFor === talent.id}
                            />
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                              {uploadingFor === talent.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UploadCloud className="w-3.5 h-3.5" />
                              )}
                              {t(
                                "agencyDashboard.catalogs.wizard.assets.upload",
                              )}
                            </div>
                          </label>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 ml-6">
                          <label className="cursor-pointer relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-colors flex flex-col items-center justify-center text-gray-500 hover:text-indigo-600 group">
                            <input
                              type="file"
                              multiple
                              accept="image/*,video/*"
                              className="hidden"
                              onChange={(e) => handleUploadAsset(talent.id, e)}
                              disabled={uploadingFor === talent.id}
                            />
                            {uploadingFor === talent.id ? (
                              <Loader2 className="w-6 h-6 animate-spin mb-1 text-indigo-600" />
                            ) : (
                              <UploadCloud className="w-6 h-6 mb-1 text-gray-400 group-hover:text-indigo-500" />
                            )}
                            <span className="text-[10px] font-semibold">
                              {t(
                                "agencyDashboard.catalogs.wizard.assets.upload",
                              )}
                            </span>
                          </label>
                          {assets.map((asset: any) => {
                            const assetId = asset.asset_id ?? asset.id;
                            const isSelected = selectedAssets.some(
                              (a) => a.asset_id === assetId,
                            );
                            return (
                              <button
                                key={assetId}
                                onClick={() =>
                                  toggleAsset(
                                    talent.id,
                                    assetId,
                                    asset.asset_type ?? asset.type ?? "image",
                                  )
                                }
                                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                                  isSelected
                                    ? "border-indigo-500 ring-2 ring-indigo-200"
                                    : "border-gray-200"
                                }`}
                              >
                                {asset.asset_type === "video" ||
                                asset.type === "video" ||
                                asset.mime_type?.startsWith("video/") ? (
                                  <div className="relative w-full h-full">
                                    <video
                                      src={asset.url}
                                      className="w-full h-full object-cover"
                                      muted
                                      loop
                                      playsInline
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors">
                                      <Play className="w-10 h-10 text-white opacity-80" />
                                    </div>
                                  </div>
                                ) : asset.url || asset.thumbnail_url ? (
                                  <img
                                    src={asset.thumbnail_url ?? asset.url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                                {isSelected && (
                                  <div className="absolute top-1 right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ---- Step: Voice ---- */}
          {step === "voice" && (
            <div className="space-y-5">
              {loadingAssets ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                </div>
              ) : selectedTalents.length === 0 ? (
                <div className="p-6 border border-dashed border-gray-200 rounded-xl text-center text-sm text-gray-400">
                  {t("agencyDashboard.catalogs.wizard.voice.noTalents")}
                </div>
              ) : (
                selectedTalents.map((talent) => {
                  const recordings = talentRecordings[talent.id] ?? [];
                  const selectedRecs =
                    form.items[talent.id]?.recording_ids ?? [];
                  return (
                    <div key={talent.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <Mic className="w-4 h-4 text-indigo-500" />
                        <p className="font-semibold text-gray-900 text-sm">
                          {talent.name}
                        </p>
                        <Badge variant="secondary" className="text-[10px]">
                          {selectedRecs.length}{" "}
                          {t("agencyDashboard.catalogs.wizard.voice.selected")}
                        </Badge>
                      </div>
                      {recordings.length === 0 ? (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-400 ml-6">
                            {t(
                              "agencyDashboard.catalogs.builder.empty.noVoiceForTalentDetailed",
                            )}
                          </p>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              multiple
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) =>
                                handleUploadRecording(talent.id, e)
                              }
                              disabled={uploadingFor === talent.id}
                            />
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                              {uploadingFor === talent.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UploadCloud className="w-3.5 h-3.5" />
                              )}
                              {t(
                                "agencyDashboard.catalogs.builder.actions.upload",
                              )}
                            </div>
                          </label>
                        </div>
                      ) : (
                        <div className="space-y-2 ml-6">
                          <label className="cursor-pointer border-2 border-dashed border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-colors rounded-xl p-3 flex items-center gap-3 text-gray-500 hover:text-indigo-600 group w-full">
                            <input
                              type="file"
                              multiple
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) =>
                                handleUploadRecording(talent.id, e)
                              }
                              disabled={uploadingFor === talent.id}
                            />
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 group-hover:bg-indigo-100 transition-colors">
                              {uploadingFor === talent.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                              ) : (
                                <UploadCloud className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                              )}
                            </div>
                            <span className="text-sm font-semibold">
                              {t(
                                "agencyDashboard.catalogs.wizard.voice.uploadNew",
                              )}
                            </span>
                          </label>
                          {recordings.map((rec: any) => {
                            const recId = rec.id;
                            const isSelected = selectedRecs.some(
                              (r) => r.recording_id === recId,
                            );
                            return (
                              <button
                                key={recId}
                                onClick={() =>
                                  toggleRecording(
                                    talent.id,
                                    recId,
                                    rec.emotion_tag,
                                  )
                                }
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                  isSelected
                                    ? "border-indigo-500 bg-indigo-50"
                                    : "border-gray-200 bg-white hover:border-gray-300"
                                }`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isSelected ? "bg-indigo-600" : "bg-gray-100"
                                  }`}
                                >
                                  <Mic
                                    className={`w-4 h-4 ${isSelected ? "text-white" : "text-gray-500"}`}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 capitalize">
                                    {rec.emotion_tag ??
                                      t(
                                        "agencyDashboard.catalogs.wizard.voice.recording",
                                      )}
                                  </p>
                                  <p className="text-[11px] text-gray-400 truncate mb-2">
                                    {rec.mime_type ?? "audio"}
                                    {rec.created_at
                                      ? ` • ${new Date(rec.created_at).toLocaleDateString()}`
                                      : ""}
                                  </p>
                                  {rec.url && (
                                    <div onClick={(e) => e.stopPropagation()}>
                                      <audio
                                        controls
                                        src={rec.url}
                                        className="h-8 w-full max-w-sm mt-1"
                                      />
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ---- Step: Review ---- */}
          {step === "review" && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">
                    {t("agencyDashboard.catalogs.wizard.review.title")}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {form.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">
                    {t("agencyDashboard.catalogs.wizard.review.client")}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {form.client_name || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">
                    {t("agencyDashboard.catalogs.wizard.review.sendTo")}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {form.client_email || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">
                    {t("agencyDashboard.catalogs.wizard.review.talents")}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {selectedTalents.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">
                    {t("agencyDashboard.catalogs.wizard.review.assets")}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {Object.values(form.items).reduce(
                      (sum, item) => sum + item.asset_ids.length,
                      0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">
                    {t("agencyDashboard.catalogs.wizard.review.recordings")}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {Object.values(form.items).reduce(
                      (sum, item) => sum + item.recording_ids.length,
                      0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">
                    {t("agencyDashboard.catalogs.wizard.review.linkedRequest")}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {form.licensing_request_id
                      ? t("agencyDashboard.catalogs.wizard.review.yes")
                      : t("agencyDashboard.catalogs.wizard.review.no")}
                  </span>
                </div>
              </div>
              {form.client_email ? (
                <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-sm font-medium text-green-800 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  {t("agencyDashboard.catalogs.wizard.review.emailNotice", {
                    email: form.client_email,
                  })}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm font-medium text-amber-800">
                  {t("agencyDashboard.catalogs.wizard.review.noEmailWarning")}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="shrink-0 px-6 pb-6 flex items-center justify-between border-t border-gray-100 pt-4 bg-white">
          <Button
            variant="outline"
            onClick={stepIndex === 0 ? onClose : goPrev}
            className="h-10 px-5 rounded-xl font-semibold"
          >
            {stepIndex === 0 ? (
              t("agencyDashboard.catalogs.wizard.actions.cancel")
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" />{" "}
                {t("agencyDashboard.catalogs.wizard.actions.back")}
              </>
            )}
          </Button>

          {step !== "review" ? (
            <Button
              onClick={goNext}
              disabled={!canNext()}
              className="h-10 px-5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700"
            >
              {t("agencyDashboard.catalogs.wizard.actions.next")}{" "}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="h-10 px-6 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />{" "}
                  {t("agencyDashboard.catalogs.wizard.actions.creating")}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />{" "}
                  {t("agencyDashboard.catalogs.wizard.actions.createAndSend")}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
