import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    Image as ImageIcon,
    Mic,
    Receipt,
    Download,
    Play,
    Pause,
    Loader2,
    AlertCircle,
    Volume2,
} from "lucide-react";
import { catalogApi } from "@/api/catalogs";

type Tab = "assets" | "voice" | "receipt";

export default function PublicCatalogView() {
    const { token } = useParams<{ token: string }>();
    const [activeTab, setActiveTab] = useState<Tab>("assets");
    const [playingRec, setPlayingRec] = useState<string | null>(null);

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

    // ------------ audio helpers -------------
    const audioRefs = React.useRef<Record<string, HTMLAudioElement | null>>({});

    const togglePlay = (url: string, recId: string) => {
        if (playingRec === recId) {
            audioRefs.current[recId]?.pause();
            setPlayingRec(null);
        } else {
            // Pause previous
            if (playingRec && audioRefs.current[playingRec]) {
                audioRefs.current[playingRec]?.pause();
            }
            setPlayingRec(recId);
            const el = audioRefs.current[recId];
            if (el) {
                el.src = url;
                el.play().catch(() => { });
            }
        }
    };

    // ------------ collect all assets and recordings across items --------------
    const allAssets: any[] = [];
    const allRecordings: any[] = [];

    if (catalog?.items) {
        for (const item of catalog.items) {
            for (const asset of item.assets ?? []) {
                allAssets.push({ ...asset, talent_name: item.talent_name });
            }
            for (const rec of item.recordings ?? []) {
                allRecordings.push({ ...rec, talent_name: item.talent_name });
            }
        }
    }

    const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
        { id: "assets", label: "Digital Assets", icon: ImageIcon, count: allAssets.length },
        { id: "voice", label: "Voice Recordings", icon: Mic, count: allRecordings.length },
        { id: "receipt", label: "License Receipt", icon: Receipt, count: catalog?.receipt ? 1 : 0 },
    ];

    // ------------ loading / error states ----------------------------------------
    if (catalogQuery.isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-sm text-gray-500 font-medium">
                        Loading your catalog…
                    </p>
                </div>
            </div>
        );
    }

    if (catalogQuery.isError || !catalog) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-sm mx-auto px-4">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">
                        Catalog Not Found
                    </h1>
                    <p className="text-sm text-gray-500">
                        This link may be invalid or the catalog may have been removed.
                        Please contact your agency for a new link.
                    </p>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-8 py-5 flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <Volume2 className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-xs font-bold text-indigo-600 tracking-wider uppercase">
                                Likelee
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 mt-1">
                            {catalog.title}
                        </h1>
                        {catalog.client_name && (
                            <p className="text-sm text-gray-500 font-medium mt-0.5">
                                Prepared for <strong>{catalog.client_name}</strong>
                            </p>
                        )}
                        {catalog.created_at && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                Delivered{" "}
                                {new Date(catalog.created_at).toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </p>
                        )}
                    </div>
                </div>
            </header>

            {/* Tab bar */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-4 sm:px-8">
                    <nav className="flex gap-1 -mb-px">
                        {tabs.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === t.id
                                        ? "border-indigo-600 text-indigo-700"
                                        : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200"
                                    }`}
                            >
                                <t.icon className="w-4 h-4" />
                                {t.label}
                                {t.count > 0 && (
                                    <span
                                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${activeTab === t.id
                                                ? "bg-indigo-100 text-indigo-700"
                                                : "bg-gray-100 text-gray-500"
                                            }`}
                                    >
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Main content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
                {/* ---- Assets tab ---- */}
                {activeTab === "assets" && (
                    <div>
                        {allAssets.length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                <p className="text-sm font-medium">No digital assets included in this catalog.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {allAssets.map((asset, idx) => (
                                    <div
                                        key={`${asset.asset_id}-${idx}`}
                                        className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="aspect-square bg-gray-50 flex items-center justify-center">
                                            {asset.url || asset.thumbnail_url ? (
                                                <img
                                                    src={asset.thumbnail_url ?? asset.url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <ImageIcon className="w-10 h-10 text-gray-300" />
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <p className="text-xs font-semibold text-gray-600 capitalize truncate">
                                                {asset.asset_type ?? "Asset"}
                                            </p>
                                            <p className="text-[11px] text-gray-400 truncate">
                                                {asset.talent_name}
                                            </p>
                                        </div>
                                        {(asset.url || asset.download_url) && (
                                            <a
                                                href={asset.download_url ?? asset.url}
                                                download
                                                target="_blank"
                                                rel="noreferrer"
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full shadow flex items-center justify-center"
                                            >
                                                <Download className="w-4 h-4 text-indigo-600" />
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ---- Voice tab ---- */}
                {activeTab === "voice" && (
                    <div>
                        {allRecordings.length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <Mic className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                <p className="text-sm font-medium">No voice recordings included in this catalog.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {allRecordings.map((rec, idx) => {
                                    const recId = rec.recording_id ?? String(idx);
                                    const isPlaying = playingRec === recId;
                                    return (
                                        <div
                                            key={recId}
                                            className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm"
                                        >
                                            {/* Hidden audio element */}
                                            <audio
                                                ref={(el) => {
                                                    audioRefs.current[recId] = el;
                                                }}
                                                onEnded={() => setPlayingRec(null)}
                                            />
                                            <button
                                                onMouseDown={() => {
                                                    // build a signed url call if needed; for now use storage_path hint
                                                    const url = rec.signed_url ?? "";
                                                    togglePlay(url, recId);
                                                }}
                                                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isPlaying
                                                        ? "bg-indigo-600"
                                                        : "bg-indigo-50 hover:bg-indigo-100"
                                                    }`}
                                            >
                                                {isPlaying ? (
                                                    <Pause className="w-4 h-4 text-white" />
                                                ) : (
                                                    <Play className="w-4 h-4 text-indigo-600 ml-0.5" />
                                                )}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 capitalize">
                                                    {rec.emotion_tag ?? "Recording"}
                                                </p>
                                                <p className="text-xs text-gray-400 truncate">
                                                    {rec.talent_name}
                                                    {rec.mime_type ? ` • ${rec.mime_type}` : ""}
                                                </p>
                                            </div>
                                            {rec.storage_path && (
                                                <span className="text-[11px] text-gray-400 font-mono truncate hidden sm:block max-w-[160px]">
                                                    {rec.storage_path.split("/").pop()}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ---- Receipt tab ---- */}
                {activeTab === "receipt" && (
                    <div>
                        {!catalog.receipt ? (
                            <div className="text-center py-20 text-gray-400">
                                <Receipt className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                <p className="text-sm font-medium">No licensing receipt available for this catalog.</p>
                            </div>
                        ) : (
                            <div className="max-w-xl mx-auto">
                                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                    {/* Receipt header */}
                                    <div className="bg-indigo-600 text-white px-6 py-5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Receipt className="w-4 h-4 opacity-80" />
                                            <span className="text-xs font-bold tracking-wider uppercase opacity-80">
                                                Licensing Receipt
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-black">
                                            {catalog.receipt.campaign_title ?? catalog.title}
                                        </h2>
                                        {catalog.receipt.client_name && (
                                            <p className="text-sm opacity-80 mt-0.5">
                                                {catalog.receipt.client_name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Receipt body */}
                                    <div className="px-6 py-6 space-y-4">
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {[
                                                {
                                                    label: "License Start",
                                                    value: catalog.receipt.license_start_date
                                                        ? new Date(catalog.receipt.license_start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                        : "—",
                                                },
                                                {
                                                    label: "License End",
                                                    value: catalog.receipt.license_end_date
                                                        ? new Date(catalog.receipt.license_end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                        : "—",
                                                },
                                                {
                                                    label: "Usage Scope",
                                                    value: catalog.receipt.usage_scope ?? "—",
                                                },
                                                {
                                                    label: "Regions",
                                                    value: Array.isArray(catalog.receipt.regions)
                                                        ? catalog.receipt.regions.join(", ")
                                                        : (catalog.receipt.regions ?? "—"),
                                                },
                                            ].map((field) => (
                                                <div key={field.label}>
                                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                        {field.label}
                                                    </p>
                                                    <p className="text-sm font-semibold text-gray-900 mt-0.5 capitalize">
                                                        {field.value}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-4 mt-4 border-t border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-gray-500">
                                                    License Fee
                                                </p>
                                                <p className="text-xl font-black text-gray-900">
                                                    {catalog.receipt.license_fee_display ?? "—"}
                                                </p>
                                            </div>
                                            <p className="text-xs text-green-600 font-semibold mt-1 text-right">
                                                ✓ Payment confirmed
                                            </p>
                                        </div>
                                    </div>

                                    <div className="px-6 pb-6">
                                        <button
                                            onClick={() => window.print()}
                                            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Print / Save as PDF
                                        </button>
                                    </div>
                                </div>

                                {catalog.notes && (
                                    <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-900 font-medium">
                                        <strong>Note: </strong>
                                        {catalog.notes}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="text-center py-8 text-xs text-gray-400">
                Powered by{" "}
                <span className="font-bold text-indigo-500">Likelee</span>
            </footer>
        </div>
    );
}
