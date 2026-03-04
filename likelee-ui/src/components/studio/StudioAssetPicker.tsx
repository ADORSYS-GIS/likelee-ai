import { useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudioAsset {
    id: string;
    type: "image" | "audio";
    name: string;
    url: string;
    campaign_name?: string;
    talent_name?: string;
    source: "upload" | "licensed";
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

export function StudioAssetPicker({ open, onClose, selectedAssets, onChange, allowedTypes }: Props) {
    const allowed = allowedTypes ?? ["image", "audio"];
    const canImage = allowed.includes("image");
    const canAudio = allowed.includes("audio");

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
    const [tab, setTab] = useState<"upload" | "licensed">("upload");
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [licenseSearch, setLicenseSearch] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // ── Licensed assets query ──────────────────────────────────────────────────
    const { data: licensedData, isLoading: loadingLicensed } = useQuery({
        queryKey: ["studio", "licensed-assets"],
        queryFn: () => base44.get<{ assets: StudioAsset[] }>("/api/studio/licensed-assets"),
        enabled: open && tab === "licensed",
        staleTime: 60_000,
    });
    const licensedAssets = licensedData?.assets ?? [];

    const filteredLicensed = licenseSearch
        ? licensedAssets.filter(a =>
            a.name.toLowerCase().includes(licenseSearch.toLowerCase()) ||
            a.campaign_name?.toLowerCase().includes(licenseSearch.toLowerCase()) ||
            a.talent_name?.toLowerCase().includes(licenseSearch.toLowerCase())
        )
        : licensedAssets;

    // ── Upload handler ─────────────────────────────────────────────────────────
    const uploadFiles = useCallback(async (files: FileList | File[]) => {
        const arr = Array.from(files);
        // Only upload types the current model supports
        const valid = arr.filter(f => {
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
                const data = await base44.post<{ file_url: string }>("/api/studio/upload", form);
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
    }, [selectedAssets, onChange, toast]);

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
        const exists = selectedAssets.some(a => a.id === asset.id);
        if (exists) {
            onChange(selectedAssets.filter(a => a.id !== asset.id));
        } else {
            onChange([...selectedAssets, asset]);
        }
    };

    const removeAsset = (id: string) => onChange(selectedAssets.filter(a => a.id !== id));

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative z-10 w-full max-w-lg mx-4 bg-[#141320] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
                    <h2 className="text-white font-semibold text-base">Add Assets</h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xl leading-none">✕</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    {(["upload", "licensed"] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${tab === t
                                ? "text-purple-400 border-b-2 border-purple-400"
                                : "text-white/40 hover:text-white/70"
                                }`}
                        >
                            {t === "upload" ? "📁 Upload" : "🔐 Licensed Assets"}
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
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={onDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? "border-purple-400 bg-purple-500/10" : "border-white/20 hover:border-white/40"
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
                                    <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Selected ({selectedAssets.length})</p>
                                    <div className="flex flex-col gap-2">
                                        {selectedAssets.map(asset => (
                                            <AssetChip key={asset.id} asset={asset} onRemove={() => removeAsset(asset.id)} />
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
                                onChange={e => setLicenseSearch(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-purple-400"
                            />

                            {loadingLicensed && (
                                <div className="text-center text-white/40 py-6 text-sm">Loading licensed assets…</div>
                            )}

                            {!loadingLicensed && filteredLicensed.length === 0 && (
                                <div className="text-center text-white/40 py-8">
                                    <div className="text-2xl mb-2">🔐</div>
                                    <p className="text-sm">No licensed assets found.</p>
                                    <p className="text-xs mt-1 text-white/30">Assets appear once a licensing request is approved.</p>
                                </div>
                            )}

                            {filteredLicensed.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                    {filteredLicensed.map(asset => {
                                        const selected = selectedAssets.some(a => a.id === asset.id);
                                        const disabled = !allowed.includes(asset.type);
                                        return (
                                            <button
                                                key={asset.id}
                                                onClick={() => !disabled && toggleLicensed(asset)}
                                                disabled={disabled}
                                                title={disabled ? `${asset.type === "image" ? "Images" : "Audio"} not supported by the selected model` : undefined}
                                                className={`text-left rounded-xl p-3 border transition-all ${disabled
                                                        ? "border-white/5 bg-white/2 opacity-35 cursor-not-allowed"
                                                        : selected
                                                            ? "border-purple-400 bg-purple-500/20"
                                                            : "border-white/10 bg-white/5 hover:border-white/30"
                                                    }`}
                                            >
                                                {asset.type === "image" ? (
                                                    <img
                                                        src={asset.url}
                                                        alt={asset.name}
                                                        className="w-full aspect-square object-cover rounded-lg mb-2"
                                                        onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100%25' height='100%25' fill='%23222'/%3E%3Ctext x='50%25' y='50%25' fill='%23666' font-size='30' text-anchor='middle' dy='.3em'%3E🖼️%3C/text%3E%3C/svg%3E"; }}
                                                    />
                                                ) : (
                                                    <div className="w-full aspect-square bg-purple-900/30 rounded-lg mb-2 flex items-center justify-center">
                                                        <span className="text-2xl">🎵</span>
                                                    </div>
                                                )}
                                                <p className="text-white text-xs font-medium truncate">{asset.name}</p>
                                                {asset.campaign_name && (
                                                    <p className="text-white/40 text-[10px] truncate mt-0.5">{asset.campaign_name}</p>
                                                )}
                                                {selected && (
                                                    <div className="mt-1.5 text-purple-400 text-[10px] font-semibold">✓ Selected</div>
                                                )}
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
                        {selectedAssets.length} asset{selectedAssets.length !== 1 ? "s" : ""} selected
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

function AssetChip({ asset, onRemove }: { asset: StudioAsset; onRemove: () => void }) {
    return (
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
            <span className="text-lg flex-shrink-0">{asset.type === "image" ? "🖼️" : "🎵"}</span>
            <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{asset.name}</p>
                {asset.campaign_name && (
                    <p className="text-white/40 text-[10px] truncate">{asset.campaign_name}</p>
                )}
            </div>
            <button onClick={onRemove} className="text-white/30 hover:text-red-400 transition-colors text-sm flex-shrink-0">✕</button>
        </div>
    );
}
