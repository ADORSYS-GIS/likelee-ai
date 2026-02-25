import React, { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    Image as ImageIcon,
    Mic,
    Receipt,
    Download,
    Loader2,
    AlertCircle,
    Play,
    Pause,
    X,
    ZoomIn,
    FileText,
    CheckCircle,
} from "lucide-react";
import { catalogApi } from "@/api/catalogs";

type Tab = "assets" | "voice" | "receipt";

/* ─── Likelee logo SVG ─── */
function LikeleeLogoIcon({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="url(#lg)" />
            <path d="M10 22V10h3v9.5h6V22H10z" fill="white" />
            <circle cx="21.5" cy="11.5" r="2.5" fill="white" />
            <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366F1" />
                    <stop offset="1" stopColor="#8B5CF6" />
                </linearGradient>
            </defs>
        </svg>
    );
}

export default function PublicCatalogView() {
    const { token } = useParams<{ token: string }>();
    const [activeTab, setActiveTab] = useState<Tab>("assets");
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

    const catalogQuery = useQuery({
        queryKey: ["public-catalog", token],
        queryFn: async () => {
            if (!token) throw new Error("No token");
            const res = await catalogApi.getPublic(token);
            return (res as any)?.data ?? res;
        },
        enabled: !!token,
        retry: false,
    });

    const catalog = catalogQuery.data as any;

    /* ── collect across items ── */
    const allAssets: any[] = [];
    const allRecordings: any[] = [];
    if (catalog?.items) {
        for (const item of catalog.items) {
            for (const a of item.assets ?? []) allAssets.push({ ...a, talent_name: item.talent_name });
            for (const r of item.recordings ?? []) allRecordings.push({ ...r, talent_name: item.talent_name });
        }
    }

    const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
        { id: "assets", label: "Digital Assets", icon: ImageIcon, count: allAssets.length },
        { id: "voice", label: "Voice Recordings", icon: Mic, count: allRecordings.length },
        { id: "receipt", label: "License Receipt", icon: Receipt, count: catalog?.receipt ? 1 : 0 },
    ];

    const toggleAudio = (recId: string) => {
        const el = audioRefs.current[recId];
        if (!el) return;
        if (playingId === recId) {
            el.pause();
            setPlayingId(null);
        } else {
            if (playingId && audioRefs.current[playingId]) audioRefs.current[playingId]!.pause();
            el.play().catch(() => { });
            setPlayingId(recId);
        }
    };

    /* ── Loading ── */
    if (catalogQuery.isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <LikeleeLogoIcon className="w-12 h-12 animate-pulse" />
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    <p className="text-sm text-gray-500 font-medium">Loading your catalog…</p>
                </div>
            </div>
        );
    }

    /* ── Error ── */
    if (catalogQuery.isError || !catalog) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-sm mx-auto px-6">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Catalog Not Found</h1>
                    <p className="text-sm text-gray-500">This link may be invalid or the catalog has been removed. Contact your agency for a new link.</p>
                </div>
            </div>
        );
    }

    const createdDate = catalog.created_at
        ? new Date(catalog.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : null;

    return (
        <div className="min-h-screen bg-white overflow-x-hidden">
            {/* Progress accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

            {/* ── HEADER ── */}
            <header className="bg-white border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-6 md:px-10 pt-10 pb-12">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
                        {/* Left: branding + title */}
                        <div>
                            <div className="flex items-center gap-2.5 mb-4">
                                <LikeleeLogoIcon className="w-8 h-8" />
                                <span className="text-xs font-black tracking-[0.2em] uppercase text-indigo-600">Likelee</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 rounded-full text-indigo-700 text-xs font-bold uppercase tracking-widest mb-3">
                                <FileText className="w-3 h-3" /> Catalog Delivery
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                                {catalog.title}
                            </h1>
                            {catalog.client_name && (
                                <p className="text-lg text-gray-500 font-medium mt-2">
                                    Prepared for <span className="text-gray-800 font-bold">{catalog.client_name}</span>
                                </p>
                            )}
                            {createdDate && (
                                <p className="text-sm text-gray-400 mt-1">Delivered {createdDate}</p>
                            )}
                        </div>

                        {/* Right: summary tiles */}
                        <div className="flex gap-3 shrink-0">
                            {[
                                { label: "Assets", value: allAssets.length },
                                { label: "Recordings", value: allRecordings.length },
                                { label: "Talents", value: catalog.items?.length ?? 0 },
                            ].map(({ label, value }) => (
                                <div key={label} className="text-center bg-gray-50 rounded-2xl px-5 py-3 min-w-[72px]">
                                    <p className="text-2xl font-black text-gray-900">{value}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── TAB BAR ── */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 md:px-10">
                    <nav className="flex gap-0 -mb-px">
                        {tabs.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-all ${activeTab === t.id
                                        ? "border-indigo-600 text-indigo-700"
                                        : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                                    }`}
                            >
                                <t.icon className="w-4 h-4" />
                                {t.label}
                                {t.count > 0 && (
                                    <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold ${activeTab === t.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
                                        }`}>
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* ── MAIN CONTENT ── */}
            <main className="max-w-6xl mx-auto px-6 md:px-10 py-12">

                {/* ═══ ASSETS TAB ═══ */}
                {activeTab === "assets" && (
                    <div>
                        {allAssets.length === 0 ? (
                            <EmptyState icon={<ImageIcon className="w-10 h-10" />} label="No digital assets included." />
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {allAssets.map((asset, idx) => {
                                    const url: string = asset.url ?? asset.thumbnail_url ?? "";
                                    const isVideo = asset.asset_type?.toLowerCase().includes("video");
                                    return (
                                        <div
                                            key={`${asset.asset_id}-${idx}`}
                                            className="group relative bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                                            onClick={() => url && !isVideo && setLightboxUrl(url)}
                                        >
                                            <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                                                {url ? (
                                                    isVideo ? (
                                                        <video
                                                            src={url}
                                                            className="w-full h-full object-cover"
                                                            muted
                                                            playsInline
                                                            onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
                                                            onMouseLeave={(e) => (e.currentTarget as HTMLVideoElement).pause()}
                                                        />
                                                    ) : (
                                                        <img
                                                            src={url}
                                                            alt=""
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                            onError={(e) => {
                                                                (e.currentTarget as HTMLImageElement).style.display = "none";
                                                            }}
                                                        />
                                                    )
                                                ) : (
                                                    <ImageIcon className="w-10 h-10 text-gray-300" />
                                                )}
                                            </div>

                                            {/* Overlay on hover */}
                                            {url && !isVideo && (
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                    <ZoomIn className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            )}

                                            <div className="p-3">
                                                <p className="text-xs font-bold text-gray-700 capitalize truncate">
                                                    {asset.asset_type ?? "Asset"}
                                                </p>
                                                <p className="text-[11px] text-gray-400 truncate mt-0.5">{asset.talent_name}</p>
                                            </div>

                                            {url && (
                                                <a
                                                    href={url}
                                                    download
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow flex items-center justify-center"
                                                    title="Download"
                                                >
                                                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                                                </a>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ VOICE TAB ═══ */}
                {activeTab === "voice" && (
                    <div>
                        {allRecordings.length === 0 ? (
                            <EmptyState icon={<Mic className="w-10 h-10" />} label="No voice recordings included." />
                        ) : (
                            <div className="space-y-3 max-w-3xl">
                                {allRecordings.map((rec, idx) => {
                                    const recId = rec.recording_id ?? String(idx);
                                    const isPlaying = playingId === recId;
                                    const signedUrl: string = rec.signed_url ?? "";
                                    const fileName = rec.storage_path?.split("/").pop() ?? "";

                                    return (
                                        <div
                                            key={recId}
                                            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${isPlaying
                                                    ? "border-indigo-200 bg-indigo-50 shadow-md"
                                                    : "border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-gray-200"
                                                }`}
                                        >
                                            <div className="flex items-center gap-4 p-4">
                                                {/* Play button */}
                                                <button
                                                    onClick={() => signedUrl && toggleAudio(recId)}
                                                    disabled={!signedUrl}
                                                    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all ${isPlaying
                                                            ? "bg-indigo-600 shadow-lg shadow-indigo-200"
                                                            : signedUrl
                                                                ? "bg-indigo-50 hover:bg-indigo-100 hover:scale-105"
                                                                : "bg-gray-100 cursor-not-allowed opacity-50"
                                                        }`}
                                                >
                                                    {isPlaying ? (
                                                        <Pause className="w-4 h-4 text-white" />
                                                    ) : (
                                                        <Play className="w-4 h-4 text-indigo-600 ml-0.5" />
                                                    )}
                                                </button>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 capitalize">
                                                        {rec.emotion_tag ?? "Recording"}
                                                    </p>
                                                    <p className="text-xs text-gray-400 truncate mt-0.5">
                                                        {rec.talent_name}
                                                        {rec.mime_type ? ` · ${rec.mime_type.split(";")[0]}` : ""}
                                                    </p>
                                                </div>

                                                {/* File name */}
                                                {fileName && (
                                                    <span className="hidden sm:block text-[11px] text-gray-300 font-mono truncate max-w-[140px]">
                                                        {fileName}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Native audio player — always rendered so browser can decode */}
                                            {signedUrl && (
                                                <div className="px-4 pb-4">
                                                    <audio
                                                        ref={(el) => { audioRefs.current[recId] = el; }}
                                                        src={signedUrl}
                                                        controls
                                                        onEnded={() => setPlayingId(null)}
                                                        onPlay={() => {
                                                            if (playingId && playingId !== recId) {
                                                                audioRefs.current[playingId]?.pause();
                                                            }
                                                            setPlayingId(recId);
                                                        }}
                                                        onPause={() => { if (playingId === recId) setPlayingId(null); }}
                                                        className="w-full h-9"
                                                        style={{ colorScheme: "light" }}
                                                    />
                                                </div>
                                            )}
                                            {!signedUrl && (
                                                <p className="px-4 pb-3 text-xs text-amber-500 font-medium">
                                                    ⚠ Audio not available — contact the agency.
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ RECEIPT TAB ═══ */}
                {activeTab === "receipt" && (
                    <div>
                        {!catalog.receipt ? (
                            <EmptyState icon={<Receipt className="w-10 h-10" />} label="No licensing receipt available." />
                        ) : (
                            <div className="max-w-xl mx-auto">
                                <div className="bg-white border border-gray-100 rounded-3xl shadow-xl overflow-hidden">
                                    {/* Header */}
                                    <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white px-8 py-8">
                                        <div className="flex items-center gap-2 mb-3 opacity-80">
                                            <Receipt className="w-4 h-4" />
                                            <span className="text-xs font-bold tracking-widest uppercase">Licensing Receipt</span>
                                        </div>
                                        <h2 className="text-2xl font-black">
                                            {catalog.receipt.campaign_title ?? catalog.title}
                                        </h2>
                                        {catalog.receipt.client_name && (
                                            <p className="text-sm opacity-80 mt-1">{catalog.receipt.client_name}</p>
                                        )}
                                    </div>

                                    {/* Body */}
                                    <div className="px-8 py-8 space-y-6">
                                        <div className="grid sm:grid-cols-2 gap-5">
                                            {[
                                                { label: "License Start", value: catalog.receipt.license_start_date ? new Date(catalog.receipt.license_start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—" },
                                                { label: "License End", value: catalog.receipt.license_end_date ? new Date(catalog.receipt.license_end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—" },
                                                { label: "Usage Scope", value: catalog.receipt.usage_scope ?? "—" },
                                                { label: "Regions", value: Array.isArray(catalog.receipt.regions) ? catalog.receipt.regions.join(", ") : (catalog.receipt.regions ?? "—") },
                                            ].map((f) => (
                                                <div key={f.label}>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{f.label}</p>
                                                    <p className="text-sm font-semibold text-gray-900 mt-1 capitalize">{f.value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="border-t border-gray-100 pt-6">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-gray-500">License Fee</p>
                                                <p className="text-3xl font-black text-gray-900">{catalog.receipt.license_fee_display ?? "—"}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-2 justify-end">
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                                <p className="text-xs font-semibold text-green-600">Payment confirmed</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => window.print()}
                                            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                        >
                                            <Download className="w-4 h-4" /> Print / Save as PDF
                                        </button>
                                    </div>
                                </div>

                                {catalog.notes && (
                                    <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-sm text-amber-800 font-medium">
                                        <strong>Note: </strong>{catalog.notes}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ── FOOTER ── */}
            <footer className="border-t border-gray-100 mt-20 py-12 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <LikeleeLogoIcon className="w-5 h-5" />
                    <span className="text-xs font-black tracking-widest uppercase text-gray-400">Likelee</span>
                </div>
                <p className="text-xs text-gray-300">Talent & licensing delivered with precision.</p>
            </footer>

            {/* ── LIGHTBOX ── */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
                    onClick={() => setLightboxUrl(null)}
                >
                    <button
                        className="absolute top-5 right-5 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                        onClick={() => setLightboxUrl(null)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <img
                        src={lightboxUrl}
                        className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                        alt="Asset"
                    />
                    <a
                        href={lightboxUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Download className="w-4 h-4" /> Download
                    </a>
                </div>
            )}
        </div>
    );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="text-center py-24 text-gray-300">
            <div className="inline-flex w-16 h-16 bg-gray-50 rounded-2xl items-center justify-center mx-auto mb-4">
                {icon}
            </div>
            <p className="text-sm font-semibold text-gray-400">{label}</p>
        </div>
    );
}
