import { useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/auth/AuthProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudioAsset {
  id: string;
  type: "image" | "audio";
  name: string;
  url: string;
  campaign_name?: string;
  talent_name?: string;
  source: "upload" | "licensed" | "storage";
  storage_path?: string;
  folder_name?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  selectedAssets: StudioAsset[];
  onChange: (assets: StudioAsset[]) => void;
  /** Which asset types the current model supports. Defaults to both if omitted. */
  allowedTypes?: ("image" | "audio")[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCEPTED_IMAGE = "image/png,image/jpeg,image/webp,image/gif";
const ACCEPTED_AUDIO = "audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/ogg";
const ACCEPTED_ALL = `${ACCEPTED_IMAGE},${ACCEPTED_AUDIO}`;

function fileType(f: File): "image" | "audio" | null {
  if (f.type.startsWith("image/")) return "image";
  if (f.type.startsWith("audio/")) return "audio";
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StudioAssetPicker({
  open,
  onClose,
  selectedAssets,
  onChange,
  allowedTypes,
}: Props) {
  const allowed = allowedTypes ?? ["image", "audio"];
  const canImage = allowed.includes("image");
  const canAudio = allowed.includes("audio");
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Build accept string from allowed types
  const acceptAttr = [
    ...(canImage ? [ACCEPTED_IMAGE] : []),
    ...(canAudio ? [ACCEPTED_AUDIO] : []),
  ].join(",");

  // Human-readable hint
  const acceptHint = [
    ...(canImage ? ["PNG, JPG, WEBP"] : []),
    ...(canAudio ? ["MP3, WAV, M4A"] : []),
  ].join(" · ");
  const [tab, setTab] = useState<"upload" | "storage" | "licensed">("upload");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [licenseSearch, setLicenseSearch] = useState("");
  const [storageSearch, setStorageSearch] = useState("");
  const [savingToStorage, setSavingToStorage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // ── Licensed assets query ──────────────────────────────────────────────────
  const { data: licensedData, isLoading: loadingLicensed } = useQuery({
    queryKey: ["studio", "licensed-assets"],
    queryFn: () =>
      base44.get<{ assets: StudioAsset[] }>("/api/studio/licensed-assets"),
    enabled: open && tab === "licensed",
    staleTime: 60_000,
  });
  const licensedAssets = licensedData?.assets ?? [];

  // ── Org storage assets query ────────────────────────────────────────────────
  const storageTypeParam = allowed.map((t) => t).join(",");
  const { data: storageData, isLoading: loadingStorage } = useQuery({
    queryKey: ["org", "storage-assets", storageTypeParam],
    queryFn: () =>
      base44.get<{ assets: StudioAsset[] }>(
        `/api/org/storage/assets?type=${storageTypeParam}`,
      ),
    enabled: open && tab === "storage",
    staleTime: 30_000,
  });
  const storageAssets = storageData?.assets ?? [];

  const filteredLicensed = licenseSearch
    ? licensedAssets.filter(
        (a) =>
          a.name.toLowerCase().includes(licenseSearch.toLowerCase()) ||
          a.campaign_name
            ?.toLowerCase()
            .includes(licenseSearch.toLowerCase()) ||
          a.talent_name?.toLowerCase().includes(licenseSearch.toLowerCase()),
      )
    : licensedAssets;

  const filteredStorage = storageSearch
    ? storageAssets.filter(
        (a) =>
          a.name.toLowerCase().includes(storageSearch.toLowerCase()) ||
          a.folder_name
            ?.toLowerCase()
            .includes(storageSearch.toLowerCase()),
      )
    : storageAssets;

  // ── Save-to-storage handler ────────────────────────────────────────────────
  const saveToStorage = useCallback(
    async (asset: StudioAsset) => {
      if (asset.source !== "upload") return;
      setSavingToStorage(asset.id);
      try {
        const data = await base44.post<{
          id: string;
          storage_path: string;
          public_url?: string | null;
          source: string;
        }>("/api/org/storage/files/save-from-url", {
          temp_url: asset.url,
          file_name: asset.name,
          mime_type:
            asset.type === "image" ? "image/png" : "audio/mpeg",
        });
        const updated = selectedAssets.map((a) =>
          a.id === asset.id
            ? {
                ...a,
                source: "storage" as const,
                storage_path: data.storage_path,
                url: data.public_url || asset.url,
                folder_name: "My Storage",
              }
            : a,
        );
        onChange(updated);
        toast({ title: "Saved to My Storage" });
      } catch (e: any) {
        toast({
          title: "Save failed",
          description: e?.message ?? "Unknown error",
          variant: "destructive",
        });
      }
      setSavingToStorage(null);
    },
    [selectedAssets, onChange, toast],
  );

  // ── Upload handler ─────────────────────────────────────────────────────────
  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      // Only upload types the current model supports
      const valid = arr.filter((f) => {
        const t = fileType(f);
        return t !== null && allowed.includes(t);
      });
      if (valid.length === 0) return;

      setUploading(true);
      const newAssets: StudioAsset[] = [];

      for (const file of valid) {
        try {
          const form = new FormData();
          form.append("file", file);
          const data = await base44.post<{ file_url: string }>(
            "/api/studio/upload",
            form,
          );
          newAssets.push({
            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: fileType(file)!,
            name: file.name,
            url: data.file_url,
            source: "upload",
          });
        } catch (e: any) {
          toast({
            title: "Upload failed",
            description: `${file.name}: ${e?.message ?? "Unknown error"}`,
            variant: "destructive",
          });
        }
      }

      if (newAssets.length > 0) {
        onChange([...selectedAssets, ...newAssets]);
      }
      setUploading(false);
    },
    [selectedAssets, onChange, toast],
  );

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
  };

  // ── Licensed asset toggle ──────────────────────────────────────────────────
  const toggleLicensed = (asset: StudioAsset) => {
    const exists = selectedAssets.some((a) => a.id === asset.id);
    if (exists) {
      onChange(selectedAssets.filter((a) => a.id !== asset.id));
    } else {
      onChange([...selectedAssets, asset]);
    }
  };

  const toggleStorage = (asset: StudioAsset) => {
    const exists = selectedAssets.some((a) => a.id === asset.id);
    if (exists) {
      onChange(selectedAssets.filter((a) => a.id !== asset.id));
    } else {
      onChange([...selectedAssets, asset]);
    }
  };

  const removeAsset = (id: string) =>
    onChange(selectedAssets.filter((a) => a.id !== id));

  // Helper to navigate to file storage dashboard
  const goToFileStorage = () => {
    const orgType = currentUser?.organization_type;
    if (orgType === "brand") {
      navigate(createPageUrl("BrandDashboard") + "?section=settings&tab=file-storage");
    } else if (orgType === "agency") {
      navigate(createPageUrl("AgencyDashboard") + "?tab=file-storage");
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-[#141320] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
          <h2 className="text-white font-semibold text-base">Add Assets</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {(["upload", "storage", "licensed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                tab === t
                  ? "text-purple-400 border-b-2 border-purple-400"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t === "upload" ? "📁 Upload" : t === "storage" ? "💾 My Storage" : "🔐 Licensed Assets"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {/* ─ Upload tab ─ */}
          {tab === "upload" && (
            <div className="p-5 flex flex-col gap-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragging
                    ? "border-purple-400 bg-purple-500/10"
                    : "border-white/20 hover:border-white/40"
                }`}
              >
                <div className="text-3xl mb-2">{uploading ? "⏳" : "📂"}</div>
                <p className="text-white/80 font-medium mb-1">
                  {uploading ? "Uploading…" : "Drop files here"}
                </p>
                <p className="text-white/40 text-xs">
                  {acceptHint || "No file types supported by this model"}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptAttr}
                  multiple
                  className="sr-only"
                  onChange={onFileInput}
                />
              </div>

              {/* Selected list */}
              {selectedAssets.length > 0 && (
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
                    Selected ({selectedAssets.length})
                  </p>
                  <div className="flex flex-col gap-2">
                    {selectedAssets.map((asset) => (
                       <AssetChip
                         key={asset.id}
                         asset={asset}
                         onRemove={() => removeAsset(asset.id)}
                         onSave={
                           asset.source === "upload"
                             ? () => saveToStorage(asset)
                             : undefined
                         }
                         saving={savingToStorage === asset.id}
                       />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─ Licensed Assets tab ─ */}
          {tab === "licensed" && (
            <div className="p-5 flex flex-col gap-3">
              <input
                type="text"
                placeholder="Search by name, talent or campaign…"
                value={licenseSearch}
                onChange={(e) => setLicenseSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-purple-400"
              />

              {loadingLicensed && (
                <div className="text-center text-white/40 py-6 text-sm">
                  Loading licensed assets…
                </div>
              )}

              {!loadingLicensed && filteredLicensed.length === 0 && (
                <div className="text-center text-white/40 py-8">
                  <div className="text-2xl mb-2">🔐</div>
                  <p className="text-sm">No licensed assets found.</p>
                  <p className="text-xs mt-1 text-white/30">
                    Assets appear once a licensing request is approved.
                  </p>
                </div>
              )}

              {filteredLicensed.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {filteredLicensed.map((asset) => {
                    const selected = selectedAssets.some(
                      (a) => a.id === asset.id,
                    );
                    const disabled = !allowed.includes(asset.type);
                    return (
                      <button
                        key={asset.id}
                        onClick={() => !disabled && toggleLicensed(asset)}
                        disabled={disabled}
                        title={
                          disabled
                            ? `${asset.type === "image" ? "Images" : "Audio"} not supported by the selected model`
                            : undefined
                        }
                        className={`group relative text-left rounded-2xl overflow-hidden transition-all duration-300 ${
                          disabled
                            ? "opacity-40 cursor-not-allowed"
                            : selected
                              ? "ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900 scale-[0.98] shadow-xl shadow-purple-500/25"
                              : "hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/40"
                        }`}
                      >
                        {/* Image/Audio Preview */}
                        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                          {asset.type === "image" ? (
                            <>
                              <img
                                src={asset.url}
                                alt={asset.name}
                                className={`w-full h-full object-cover transition-transform duration-500 ${
                                  disabled
                                    ? "grayscale"
                                    : "group-hover:scale-110"
                                }`}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100%25' height='100%25' fill='%23222'/%3E%3Ctext x='50%25' y='50%25' fill='%23666' font-size='30' text-anchor='middle' dy='.3em'%3E🖼️%3C/text%3E%3C/svg%3E";
                                }}
                              />
                              {/* Gradient overlay on hover */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-900/40 via-purple-800/30 to-pink-900/40 flex items-center justify-center backdrop-blur-sm">
                              <div className="relative">
                                <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full animate-pulse" />
                                <span className="relative text-5xl drop-shadow-lg">🎵</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Licensed Badge */}
                          <div className="absolute top-2 left-2 bg-emerald-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            LICENSED
                          </div>
                          
                          {/* Selection Checkmark */}
                          {selected && (
                            <div className="absolute top-2 right-2 w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          
                          {/* Disabled overlay */}
                          {disabled && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <div className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                                Not Supported
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Info Section */}
                        <div className={`p-3 bg-gradient-to-b transition-colors duration-300 ${
                          selected 
                            ? "from-purple-950/60 to-purple-900/40" 
                            : "from-slate-900/95 to-slate-800/95 group-hover:from-slate-800/95 group-hover:to-slate-700/95"
                        }`}>
                          <p className="text-white text-sm font-semibold truncate mb-1 tracking-tight">
                            {asset.name}
                          </p>
                          {asset.campaign_name && (
                            <div className="flex items-center gap-1 text-white/50 text-xs truncate">
                              <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                              </svg>
                              <span className="truncate">{asset.campaign_name}</span>
                            </div>
                          )}
                          {asset.talent_name && (
                            <div className="flex items-center gap-1 text-purple-400/70 text-xs truncate mt-0.5">
                              <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                              <span className="truncate">{asset.talent_name}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─ My Storage tab ─ */}
          {tab === "storage" && (
            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search by name or folder…"
                  value={storageSearch}
                  onChange={(e) => setStorageSearch(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-purple-400"
                />
                <button
                  onClick={goToFileStorage}
                  title="Open File Storage Dashboard"
                  className="flex-shrink-0 p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors group"
                >
                  <svg className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>

              {loadingStorage && (
                <div className="text-center text-white/40 py-6 text-sm">
                  Loading storage assets…
                </div>
              )}

              {!loadingStorage && filteredStorage.length === 0 && (
                <div className="text-center text-white/40 py-8">
                  <div className="text-2xl mb-2">💾</div>
                  <p className="text-sm">No storage assets found.</p>
                  <p className="text-xs mt-1 text-white/30">
                    Upload files to your organization storage to see them here.
                  </p>
                  <button
                    onClick={goToFileStorage}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    Go to File Storage
                  </button>
                </div>
              )}

              {filteredStorage.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {filteredStorage.map((asset) => {
                    const selected = selectedAssets.some(
                      (a) => a.id === asset.id,
                    );
                    const disabled = !allowed.includes(asset.type);
                    return (
                      <button
                        key={asset.id}
                        onClick={() => !disabled && toggleStorage(asset)}
                        disabled={disabled}
                        title={
                          disabled
                            ? `${asset.type === "image" ? "Images" : "Audio"} not supported by the selected model`
                            : undefined
                        }
                        className={`group relative text-left rounded-2xl overflow-hidden transition-all duration-300 ${
                          disabled
                            ? "opacity-40 cursor-not-allowed"
                            : selected
                              ? "ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900 scale-[0.98] shadow-xl shadow-purple-500/25"
                              : "hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/40"
                        }`}
                      >
                        {/* Image/Audio Preview */}
                        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                          {asset.type === "image" ? (
                            <>
                              <img
                                src={asset.url}
                                alt={asset.name}
                                className={`w-full h-full object-cover transition-transform duration-500 ${
                                  disabled
                                    ? "grayscale"
                                    : "group-hover:scale-110"
                                }`}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100%25' height='100%25' fill='%23222'/%3E%3Ctext x='50%25' y='50%25' fill='%23666' font-size='30' text-anchor='middle' dy='.3em'%3E🖼️%3C/text%3E%3C/svg%3E";
                                }}
                              />
                              {/* Gradient overlay on hover */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-900/40 via-purple-800/30 to-pink-900/40 flex items-center justify-center backdrop-blur-sm">
                              <div className="relative">
                                <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full animate-pulse" />
                                <span className="relative text-5xl drop-shadow-lg">🎵</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Selection Checkmark */}
                          {selected && (
                            <div className="absolute top-2 right-2 w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          
                          {/* Disabled overlay */}
                          {disabled && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <div className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                                Not Supported
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Info Section */}
                        <div className={`p-3 bg-gradient-to-b transition-colors duration-300 ${
                          selected 
                            ? "from-purple-950/60 to-purple-900/40" 
                            : "from-slate-900/95 to-slate-800/95 group-hover:from-slate-800/95 group-hover:to-slate-700/95"
                        }`}>
                          <p className="text-white text-sm font-semibold truncate mb-1 tracking-tight">
                            {asset.name}
                          </p>
                          {asset.folder_name && (
                            <div className="flex items-center gap-1 text-white/50 text-xs">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                              </svg>
                              <span className="truncate">{asset.folder_name}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-white/40 text-sm">
            {selectedAssets.length} asset
            {selectedAssets.length !== 1 ? "s" : ""} selected
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AssetChip ────────────────────────────────────────────────────────────────

function AssetChip({
  asset,
  onRemove,
  onSave,
  saving,
}: {
  asset: StudioAsset;
  onRemove: () => void;
  onSave?: () => void;
  saving?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
      <span className="text-lg flex-shrink-0">
        {asset.type === "image" ? "🖼️" : "🎵"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium truncate">{asset.name}</p>
        <p className="text-white/40 text-[10px] truncate">
          {asset.source === "storage"
            ? asset.folder_name
              ? `📁 ${asset.folder_name}`
              : "💾 Storage"
            : asset.source === "licensed"
              ? "🔐 Licensed"
              : "📤 Temp upload"}
        </p>
      </div>
      {asset.source === "upload" && onSave && (
        <button
          onClick={onSave}
          disabled={saving}
          className="text-white/30 hover:text-purple-400 transition-colors text-sm flex-shrink-0"
          title="Save to storage"
        >
          {saving ? "⏳" : "💾"}
        </button>
      )}
      <button
        onClick={onRemove}
        className="text-white/30 hover:text-red-400 transition-colors text-sm flex-shrink-0"
      >
        ✕
      </button>
    </div>
  );
}
