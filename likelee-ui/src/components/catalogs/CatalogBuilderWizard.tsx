import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("select-request");
  const [sourceId, setSourceId] = useState<string>("");
  const [form, setForm] = useState<FormState>({
    title: "",
    client_name: "",
    client_email: "",
    licensing_request_id: "",
    expires_at: "",
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
      toast({ title: "Asset uploaded successfully" });
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e.message || "Something went wrong",
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
      toast({ title: "Recording uploaded successfully" });
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e.message || "Something went wrong",
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
        title: "Catalog created!",
        description: email
          ? `Catalog sent to ${email}.`
          : "Catalog created. Copy the link to share.",
      });
      onCreated();
    },
    onError: (e: any) => {
      toast({
        title: "Failed to create catalog",
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
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const goNext = async () => {
    if (step === "select-request") {
      await loadTalentData(selectedTalents);
    }
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  };
  const goPrev = () => {
    const prev = STEPS[stepIndex - 1];
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
      <DialogContent className="max-w-4xl w-full rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl font-bold text-gray-900">
            Create Asset Catalog
          </DialogTitle>
          <DialogDescription className="text-gray-500 font-medium">
            Bundle approved assets and voice recordings for client delivery.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 pt-4">
          {STEPS.map((s, i) => (
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
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px bg-gray-200 mx-1" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-5 min-h-[400px] overflow-y-auto max-h-[650px]">
          {/* ---- Step: Info ---- */}
          {step === "info" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>
                  Catalog Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Spring Campaign – Voice Pack"
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Internal notes about this catalog..."
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Catalog Expiration <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, expires_at: e.target.value }))
                  }
                />
                <p className="text-[10px] text-gray-400">
                  Public link will become inaccessible after this date/time.
                </p>
              </div>
            </div>
          )}

          {/* ---- Step: Select Request ---- */}
          {step === "select-request" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 font-medium">
                Select a paid licensing request to link this catalog to. This
                will also populate a receipt for the client.
              </p>
              {eligibleQuery.isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                </div>
              ) : eligibleRequests.length === 0 ? (
                <div className="p-6 border border-dashed border-gray-200 rounded-xl text-center text-sm text-gray-400">
                  No paid licensing requests available. You can still create a
                  catalog without linking a request.
                </div>
              ) : (
                eligibleRequests.map((req: any) => {
                  const selected = sourceId === req.id;
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
                            {req.client_name || "Unnamed Client"}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {req.client_email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {req.total_amount_cents && (
                            <Badge
                              variant="secondary"
                              className="bg-green-50 text-green-700"
                            >
                              ${(req.total_amount_cents / 100).toFixed(2)} Paid
                            </Badge>
                          )}
                          {selected && (
                            <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                      {req.paid_at && (
                        <p className="text-[11px] text-gray-400 mt-1.5">
                          Paid{" "}
                          {new Date(req.paid_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      )}
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
                    Loading assets…
                  </span>
                </div>
              ) : selectedTalents.length === 0 ? (
                <div className="p-6 border border-dashed border-gray-200 rounded-xl text-center text-sm text-gray-400">
                  No talents linked. Go back and select a source request — or
                  skip to the Voice step.
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
                          {selectedAssets.length} selected
                        </Badge>
                      </div>
                      {assets.length === 0 ? (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-400 ml-6">
                            No assets found for this talent.
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
                              Upload
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
                              Upload
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
                  No talents linked. Go back and select a source request.
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
                          {selectedRecs.length} selected
                        </Badge>
                      </div>
                      {recordings.length === 0 ? (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-400 ml-6">
                            No voice recordings uploaded by this talent yet.
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
                              Upload
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
                              Upload New Recording
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
                                    {rec.emotion_tag ?? "Recording"}
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
                  <span className="text-gray-500 font-medium">Title</span>
                  <span className="font-semibold text-gray-900">
                    {form.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Client</span>
                  <span className="font-semibold text-gray-900">
                    {form.client_name || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Send to</span>
                  <span className="font-semibold text-gray-900">
                    {form.client_email || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Talents</span>
                  <span className="font-semibold text-gray-900">
                    {selectedTalents.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Assets</span>
                  <span className="font-semibold text-gray-900">
                    {Object.values(form.items).reduce(
                      (sum, item) => sum + item.asset_ids.length,
                      0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Recordings</span>
                  <span className="font-semibold text-gray-900">
                    {Object.values(form.items).reduce(
                      (sum, item) => sum + item.recording_ids.length,
                      0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">
                    Linked Request
                  </span>
                  <span className="font-semibold text-gray-900">
                    {form.licensing_request_id ? "Yes" : "No"}
                  </span>
                </div>
              </div>
              {form.client_email ? (
                <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-sm font-medium text-green-800 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  The catalog link will be emailed to{" "}
                  <strong>{form.client_email}</strong>.
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm font-medium text-amber-800">
                  No client email set — you'll need to copy and share the link
                  manually.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-6 pb-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <Button
            variant="outline"
            onClick={stepIndex === 0 ? onClose : goPrev}
            className="h-10 px-5 rounded-xl font-semibold"
          >
            {stepIndex === 0 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </>
            )}
          </Button>

          {step !== "review" ? (
            <Button
              onClick={goNext}
              disabled={!canNext()}
              className="h-10 px-5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="h-10 px-6 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Create & Send
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
