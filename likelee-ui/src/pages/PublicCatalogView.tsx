import React, { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    Loader2,
    AlertCircle,
    ChevronLeft,
    Image as ImageIcon,
    Film,
    Mic,
    Download,
    Play,
    Pause,
    X,
    ZoomIn,
    User,
    Receipt,
    ChevronRight,
    Calendar,
    MapPin,
    Globe,
    CreditCard,
    CheckCircle2,
    FastForward,
} from "lucide-react";
import { catalogApi } from "@/api/catalogs";

/* ─── Types ─── */
type View = "talents" | "talent-detail" | "category";
type Category = "images" | "videos" | "voice";

/* ─── Likelee Logo ─── */
function LikeleeLogoMark({ className = "h-8" }: { className?: string }) {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <svg width="36" height="24" viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.5 12L1.5 17.5V6.5L7.5 12Z" fill="#4DD0E1" />
                <path d="M34.5 12C34.5 12 28.5 22 18.5 22C8.5 22 7.5 12 7.5 12C7.5 12 8.5 2 18.5 2C28.5 2 34.5 12 34.5 12Z" fill="url(#fishGrad)" />
                <circle cx="18.5" cy="12" r="5" fill="white" />
                <path d="M18.5 9.5L19.4265 11.3765L21.5 11.6765L20 13.1385L20.3541 15.2045L18.5 14.2295L16.6459 15.2045L17 13.1385L15.5 11.6765L17.5735 11.3765L18.5 9.5Z" fill="#FF8A65" />
                <defs>
                    <linearGradient id="fishGrad" x1="7.5" y1="12" x2="34.5" y2="12" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#4DD0E1" />
                        <stop offset="0.4" stopColor="#FFD54F" />
                        <stop offset="1" stopColor="#FF8A65" />
                    </linearGradient>
                </defs>
            </svg>
            <span className="text-2xl font-black text-[#1A1F2C] tracking-tighter">Likelee</span>
        </div>
    );
}

/* ─── Main Component ─── */
export default function PublicCatalogView() {
    const { token } = useParams<{ token: string }>();
    const [view, setView] = useState<View>("talents");
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [brokenCoverIds, setBrokenCoverIds] = useState<Record<string, boolean>>({});
    const [activeCategory, setActiveCategory] = useState<Category>("images");
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [playbackSpeeds, setPlaybackSpeeds] = useState<Record<string, number>>({});
    const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

    const { data, isLoading, isError } = useQuery({
        queryKey: ["public-catalog", token],
        queryFn: async () => {
            if (!token) throw new Error("No token");
            const res = await catalogApi.getPublic(token);
            return (res as any)?.data ?? res;
        },
        enabled: !!token,
        retry: false,
    });

    const catalog = data as any;

    /* ── audio ── */
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

    /* ── per-talent filtered assets ── */
    const talentImages = selectedItem?.assets?.filter((a: any) =>
        !a.asset_type?.toLowerCase().includes("video")) ?? [];
    const talentVideos = selectedItem?.assets?.filter((a: any) =>
        a.asset_type?.toLowerCase().includes("video")) ?? [];
    const talentVoice = selectedItem?.recordings ?? [];

    const coverUrl = (item: any): string => {
        const talentPhotoUrl =
            typeof item?.talent_photo_url === "string"
                ? item.talent_photo_url.trim()
                : "";

        const isVideoAsset = (a: any): boolean => {
            const t = typeof a?.asset_type === "string" ? a.asset_type.toLowerCase() : "";
            const t2 = typeof a?.type === "string" ? a.type.toLowerCase() : "";
            const mime = typeof a?.mime_type === "string" ? a.mime_type.toLowerCase() : "";
            const url = typeof a?.url === "string" ? a.url.toLowerCase() : "";
            return (
                t.includes("video") ||
                t2.includes("video") ||
                mime.startsWith("video/") ||
                url.endsWith(".mp4") ||
                url.endsWith(".mov") ||
                url.endsWith(".webm")
            );
        };

        const pickUrlFromAsset = (a: any): string => {
            const candidates = [a?.thumbnail_url, a?.url, a?.public_url, a?.signed_url];
            const s = candidates.find(
                (x) => typeof x === "string" && x.trim().length > 0,
            );
            return typeof s === "string" ? s.trim() : "";
        };

        // Prefer an image-like asset for the cover. If only videos exist, fall back to thumbnail_url.
        const preferredAssetUrl =
            item?.assets
                ?.filter((a: any) => !isVideoAsset(a))
                ?.map(pickUrlFromAsset)
                ?.find((u: string) => u.length > 0) ??
            "";

        const videoThumbUrl =
            item?.assets
                ?.filter((a: any) => isVideoAsset(a))
                ?.map((a: any) =>
                    typeof a?.thumbnail_url === "string" ? a.thumbnail_url.trim() : "",
                )
                ?.find((u: string) => u.length > 0) ??
            "";

        const firstAssetUrl =
            item?.assets
                ?.map((a: any) => {
                    const candidates = [a?.url, a?.public_url, a?.thumbnail_url, a?.signed_url];
                    const s = candidates.find((x) => typeof x === "string" && x.trim().length > 0);
                    return typeof s === "string" ? s.trim() : "";
                })
                ?.find((u: string) => u.length > 0) ?? "";

        return talentPhotoUrl || preferredAssetUrl || videoThumbUrl || firstAssetUrl || "";
    };

    /* ── Loading / Error ── */
    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <LikeleeLogoMark className="animate-pulse" />
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    <p className="text-sm text-gray-400 font-medium tracking-wide">Loading catalog…</p>
                </div>
            </div>
        );
    }

    if (isError || !catalog) {
        const status = (isError as any)?.response?.status;
        const isExpired = status === 410;

        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center px-6">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">
                        {isExpired ? "Link Expired" : "Catalog Not Found"}
                    </h1>
                    <p className="text-sm text-gray-400 font-medium">
                        {isExpired
                            ? "This distribution link has reached its expiration date and is no longer accessible."
                            : "This link may be invalid or has been removed."}
                    </p>
                </div>
            </div>
        );
    }

    const createdDate = catalog.created_at
        ? new Date(catalog.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : null;

    const displayExpiry = catalog.expires_at
        ? new Date(catalog.expires_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        })
        : null;

    const agency = catalog.agency ?? {};

    return (
        <div className="min-h-screen bg-[#FDFDFF] text-[#1A1F2C] overflow-x-hidden font-sans">
            {/* Top Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4DD0E1] via-[#FFD54F] to-[#FF8A65]" />

            {/* ═══ TOP NAVBAR ═══ */}
            <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 md:px-10 py-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <LikeleeLogoMark />
                    </div>

                    <div className="flex flex-col items-end">
                        <div className="text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">Curated By</p>
                            {agency.logo_url ? (
                                <img src={agency.logo_url} alt={agency.agency_name} className="h-10 object-contain mb-1" />
                            ) : (
                                <p className="text-lg font-black text-[#1A1F2C] tracking-tight mb-1">{agency.agency_name || "Academy"}</p>
                            )}
                        </div>
                        {createdDate && <p className="text-[10px] text-gray-400 font-medium mt-1">Delivered on {createdDate}</p>}
                        {displayExpiry && (
                            <p className="text-[10px] text-orange-500 font-bold mt-0.5">
                                Link expires on {displayExpiry}
                            </p>
                        )}
                    </div>
                </div>
            </nav>

            {/* ═══════════════════════════════════════════════
                VIEW 1: TALENT CARD GRID
            ═══════════════════════════════════════════════ */}
            {view === "talents" && (
                <div className="max-w-7xl mx-auto px-6 md:px-10 pt-20 pb-24">
                    {/* Hero heading */}
                    <div className="mb-16">
                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-[#1A1F2C] leading-[0.9] mb-6">
                            {catalog.title}
                        </h1>
                        {catalog.client_name && (
                            <p className="text-2xl text-gray-400 font-medium">
                                Prepared for <span className="text-gray-900 font-bold">{catalog.client_name}</span>
                            </p>
                        )}
                        {catalog.notes && (
                            <p className="mt-6 text-lg text-gray-400 font-medium leading-relaxed max-w-3xl">
                                {catalog.notes}
                            </p>
                        )}
                    </div>

                    {/* Catalog Overview Stats */}
                    {(() => {
                        const totalTalents = catalog?.items?.length || 0;
                        const totalAssets = catalog?.items?.reduce((acc: number, item: any) => acc + (item.assets?.length || 0), 0) || 0;
                        const totalVoice = catalog?.items?.reduce((acc: number, item: any) => acc + (item.recordings?.length || 0), 0) || 0;

                        return (
                            <div className="flex flex-wrap gap-8 items-center mb-16 pb-12 border-b border-gray-100">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-1">Total Talents</span>
                                    <span className="text-4xl font-black text-[#1A1F2C] tracking-tighter">{totalTalents}</span>
                                </div>
                                <div className="w-px h-10 bg-gray-100 hidden sm:block" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD54F] mb-1">Visual Assets</span>
                                    <span className="text-4xl font-black text-[#1A1F2C] tracking-tighter">{totalAssets}</span>
                                </div>
                                <div className="w-px h-10 bg-gray-100 hidden sm:block" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF8A65] mb-1">Voice Samples</span>
                                    <span className="text-4xl font-black text-[#1A1F2C] tracking-tighter">{totalVoice}</span>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Talent cards */}
                    <div className={`grid gap-10 ${(catalog.items?.length ?? 0) === 1
                        ? "grid-cols-1 max-w-sm"
                        : (catalog.items?.length ?? 0) === 2
                            ? "grid-cols-1 sm:grid-cols-2 max-w-2xl"
                            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        }`}>
                        {(catalog.items ?? []).map((item: any, idx: number) => {
                            const photo = coverUrl(item);
                            const name = item.talent_stage_name ?? item.talent_name ?? "Talent";
                            const itemId = String(item.talent_id ?? idx);
                            const showPhoto = !!photo && !brokenCoverIds[itemId];

                            return (
                                <div
                                    key={item.talent_id ?? idx}
                                    onClick={() => {
                                        setSelectedItem(item);
                                        setView("talent-detail");
                                        setPlayingId(null);
                                    }}
                                    className="group relative cursor-pointer aspect-[3/4] bg-gray-100 rounded-[40px] overflow-hidden shadow-2xl shadow-gray-200 transition-all duration-500 hover:-translate-y-3"
                                >
                                    {/* Cover Image */}
                                    {showPhoto ? (
                                        <img
                                            src={photo}
                                            alt={name}
                                            className="absolute inset-0 w-full h-full object-cover grayscale transition-all duration-700 scale-100 group-hover:scale-105 group-hover:grayscale-0"
                                            onError={() =>
                                                setBrokenCoverIds((prev) => ({
                                                    ...prev,
                                                    [itemId]: true,
                                                }))
                                            }
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <User className="w-20 h-20 text-gray-300" />
                                        </div>
                                    )}

                                    {/* Vignette */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                                    {/* Card Content Overlay */}
                                    <div className="absolute inset-0 p-8 flex flex-col justify-end">
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Talent</p>
                                                <h3 className="text-3xl font-black text-white tracking-tighter leading-none">{name}</h3>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <ChevronRight className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Receipt link */}
                    {catalog.receipt && (
                        <div className="mt-24 flex justify-center">
                            <button
                                onClick={() => { setView("talent-detail"); setSelectedItem({ _receipt: true }); }}
                                className="flex items-center gap-3 px-10 py-4 rounded-full bg-white border border-gray-100 shadow-xl shadow-gray-200 text-sm font-black text-gray-500 hover:text-indigo-600 hover:border-indigo-100 transition-all hover:-translate-y-1"
                            >
                                <Receipt className="w-4 h-4" /> View License Receipt
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════
                VIEW 2: TALENT DETAIL — 3 CATEGORY CARDS
            ═══════════════════════════════════════════════ */}
            {view === "talent-detail" && selectedItem && (
                <div className="max-w-6xl mx-auto px-6 md:px-10 pt-8 pb-24">
                    {/* Back Button (Top) */}
                    <button
                        onClick={() => { setView("talents"); setSelectedItem(null); }}
                        className="group flex items-center gap-3 text-sm font-black text-gray-400 hover:text-gray-900 transition-all mb-10"
                    >
                        <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-gray-50 transition-all">
                            <ChevronLeft className="w-5 h-5" />
                        </div>
                        Back to Talents
                    </button>
                    {selectedItem._receipt ? (
                        <div className="max-w-4xl mx-auto">
                            {/* Receipt Header */}
                            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                        <CheckCircle2 className="w-3 h-3" /> Validated License
                                    </div>
                                    <p className="text-[10px] font-black tracking-widest uppercase text-indigo-500 mb-1">Official Document</p>
                                    <h2 className="text-5xl font-black tracking-tighter text-[#1A1F2C] leading-none">
                                        License Receipt
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 font-medium">Issue Date</p>
                                    <p className="text-sm font-bold text-gray-900">{createdDate}</p>
                                </div>
                            </div>

                            {/* Main Content Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Left Column: Client & Campaign */}
                                <div className="md:col-span-2 space-y-8">
                                    <div className="bg-white border border-gray-100 rounded-[40px] p-10 shadow-sm">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8 pb-4 border-b border-gray-50">Campaign Specifications</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Campaign Title</p>
                                                <p className="text-2xl font-black text-gray-900 leading-tight">{catalog.receipt.campaign_title || "Untitled Campaign"}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Licensee (Client)</p>
                                                <p className="text-2xl font-black text-gray-900 leading-tight">{catalog.receipt.client_name || "N/A"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-gray-100 rounded-[40px] p-10 shadow-sm">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8 pb-4 border-b border-gray-50">Usage & Distribution</h3>
                                        <div className="space-y-10">
                                            <div className="flex gap-6">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                                                    <Globe className="w-6 h-6 text-indigo-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Rights Scope</p>
                                                    <p className="text-lg font-bold text-gray-900 leading-relaxed capitalize">
                                                        {catalog.receipt.usage_scope || "Standard Content License"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-6">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                                                    <MapPin className="w-6 h-6 text-indigo-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Authorized Regions</p>
                                                    <p className="text-lg font-bold text-gray-900 leading-relaxed capitalize">
                                                        {catalog.receipt.regions || "Worldwide / All Territories"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Meta & Fee */}
                                <div className="space-y-8">
                                    <div className="bg-gray-900 rounded-[40px] p-10 text-white shadow-2xl">
                                        <div className="mb-10">
                                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                                                <CreditCard className="w-6 h-6 text-white" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Total License Fee</p>
                                            <p className="text-4xl font-black">{catalog.receipt.license_fee_display || "$0.00"}</p>
                                        </div>
                                        <div className="space-y-6 pt-6 border-t border-white/10">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-white/50">Status</span>
                                                <span className="text-xs font-black uppercase tracking-widest text-green-400">Paid</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-white/50">ID</span>
                                                <span className="text-[10px] font-mono text-white/30 truncate max-w-[100px] uppercase">
                                                    {catalog.receipt.id?.split('-')[0] || "REF-0000"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-gray-100 rounded-[40px] p-10 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full -mr-16 -mt-16 blur-3xl" />
                                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8 border-b border-gray-50 pb-4">License Validity</h3>
                                        <div className="space-y-8">
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                                    <Calendar className="w-4 h-4 text-indigo-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Activation Date</p>
                                                    <p className="text-base font-black text-gray-900 leading-none">
                                                        {catalog.receipt.license_start_date
                                                            ? new Date(catalog.receipt.license_start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                            : new Date(catalog.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-medium mt-1">Full rights active</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                                    <Calendar className="w-4 h-4 text-orange-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">Term Expiry</p>
                                                    <p className="text-base font-black text-gray-900 leading-none">
                                                        {catalog.receipt.license_end_date
                                                            ? new Date(catalog.receipt.license_end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                            : "Permanent License"}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-medium mt-1">
                                                        {catalog.receipt.license_end_date ? "End of usage rights" : "Lifetime digital rights"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Agency Attribution Footer */}
                            <div className="mt-16 p-10 border border-dashed border-gray-200 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="flex items-center gap-6">
                                    {agency.logo_url ? (
                                        <img src={agency.logo_url} alt={agency.agency_name} className="h-10 object-contain grayscale opacity-50" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                                            <User className="w-6 h-6 text-gray-200" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Issued by</p>
                                        <p className="text-lg font-black text-gray-900 tracking-tight">{agency.agency_name || "The Academy Lab"}</p>
                                    </div>
                                </div>
                                <div className="text-center md:text-right">
                                    <p className="text-[11px] text-gray-400 font-medium max-w-xs">
                                        This is a computer-generated receipt for a digitally licensed asset collection through the Likelee platform.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Talent Info */}
                            <div className="flex items-center gap-6 mb-16">
                                {coverUrl(selectedItem) ? (
                                    <img
                                        src={coverUrl(selectedItem)}
                                        alt={selectedItem.talent_name}
                                        className="w-24 h-24 rounded-[32px] object-cover shadow-2xl shadow-gray-200 grayscale"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-[32px] bg-gray-50 border border-gray-100 flex items-center justify-center">
                                        <User className="w-12 h-12 text-gray-200" />
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] font-black tracking-widest uppercase text-indigo-500 mb-1">Exclusive Portfolio</p>
                                    <h2 className="text-5xl font-black tracking-tighter text-[#1A1F2C] leading-none">
                                        {selectedItem.talent_stage_name ?? selectedItem.talent_name ?? "Talent"}
                                    </h2>
                                </div>
                            </div>

                            {/* Catalog Info Strip */}
                            <div className="mb-20 max-w-2xl">
                                <h1 className="text-4xl font-black tracking-tight text-[#1A1F2C] mb-6">
                                    Asset Collection Experience
                                </h1>
                                <p className="text-gray-400 text-xl font-medium leading-relaxed">
                                    A refined selection of high-end media assets delivered with precision.
                                    Browse studio photography, cinema recordings, and professional voice architecture.
                                </p>
                            </div>

                            {/* ── 3 Category Cards ── */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    {
                                        id: "images" as Category,
                                        icon: ImageIcon,
                                        label: "Images",
                                        desc: "High-resolution photography and editorial studio capture.",
                                        count: (selectedItem?.assets ?? []).filter((a: any) => !a.asset_type?.toLowerCase().includes("video")).length,
                                        color: "#4DD0E1",
                                    },
                                    {
                                        id: "videos" as Category,
                                        icon: Film,
                                        label: "Videos",
                                        desc: "Cinematic footage and high-fidelity motion graphics production.",
                                        count: (selectedItem?.assets ?? []).filter((a: any) => a.asset_type?.toLowerCase().includes("video")).length,
                                        color: "#FFD54F",
                                    },
                                    {
                                        id: "voice" as Category,
                                        icon: Mic,
                                        label: "Voice",
                                        desc: "Elite vocal architecture and studio-grade audio synthesis.",
                                        count: (selectedItem?.recordings ?? []).length,
                                        color: "#FF8A65",
                                    },
                                ].map(({ id, icon: Icon, label, desc, count, color }) => (
                                    <button
                                        key={id}
                                        onClick={() => { setActiveCategory(id); setView("category"); }}
                                        className={`group relative bg-white border border-gray-100 rounded-[48px] p-12 text-center transition-all duration-500 hover:shadow-[0_40px_80px_rgba(0,0,0,0.06)] hover:-translate-y-3`}
                                    >
                                        <div
                                            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-10 transition-all duration-500 group-hover:scale-110 shadow-lg shadow-gray-50`}
                                            style={{ backgroundColor: `${color}10`, border: `2.5px solid ${color}30` }}
                                        >
                                            <Icon className="w-10 h-10" style={{ color: color }} />
                                        </div>

                                        <h3 className="text-3xl font-black text-[#1A1F2C] mb-4 tracking-tighter">{label}</h3>
                                        <p className="text-sm text-gray-400 font-medium leading-relaxed mb-8">{desc}</p>

                                        {count > 0 ? (
                                            <div
                                                className="inline-flex items-center px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors"
                                                style={{ backgroundColor: `${color}15`, color: color }}
                                            >
                                                {count} {count === 1 ? "Item" : "Items"}
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-200">Archive Empty</div>
                                        )}

                                        <div className="mt-10 flex justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-3 group-hover:translate-y-0">
                                            <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-white shadow-xl">
                                                <ZoomIn className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                        </>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════
                VIEW 3: CATEGORY CONTENT
            ═══════════════════════════════════════════════ */}
            {view === "category" && selectedItem && (
                <div className="max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-24">
                    {/* Back Button (Top) */}
                    <button
                        onClick={() => setView("talent-detail")}
                        className="group flex items-center gap-3 text-sm font-black text-gray-400 hover:text-gray-900 transition-all mb-10"
                    >
                        <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-gray-50 transition-all">
                            <ChevronLeft className="w-5 h-5" />
                        </div>
                        Back to Overview
                    </button>
                    {/* Content Header */}
                    <div className="flex items-end justify-between mb-16 border-b border-gray-100 pb-10">
                        <div className="flex items-center gap-8">
                            <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center bg-white border border-gray-100 shadow-xl shadow-gray-50`}>
                                {activeCategory === "images" && <ImageIcon className="w-8 h-8 text-[#4DD0E1]" />}
                                {activeCategory === "videos" && <Film className="w-8 h-8 text-[#FFD54F]" />}
                                {activeCategory === "voice" && <Mic className="w-8 h-8 text-[#FF8A65]" />}
                            </div>
                            <div>
                                <h1 className="text-5xl font-black text-[#1A1F2C] capitalize tracking-tighter leading-none mb-3">{activeCategory}</h1>
                                <p className="text-lg text-gray-400 font-medium">Portfolio showcase for <span className="text-gray-900 font-black">{selectedItem.talent_stage_name ?? selectedItem.talent_name}</span></p>
                            </div>
                        </div>
                        <button className="hidden md:flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-black hover:bg-black transition-all shadow-xl shadow-gray-200">
                            <Download className="w-5 h-5" /> Download Repository
                        </button>
                    </div>

                    {/* ── Images ── */}
                    {activeCategory === "images" && (
                        talentImages.length === 0 ? (
                            <EmptyState icon={<ImageIcon />} label="Nothing to display in this wing." />
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {talentImages.map((asset: any, idx: number) => (
                                    <div
                                        key={`${asset.asset_id}-${idx}`}
                                        className="group relative aspect-square rounded-[40px] overflow-hidden cursor-pointer bg-gray-50 border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500"
                                        onClick={() => asset.url && setLightboxUrl(asset.url)}
                                    >
                                        <img
                                            src={asset.url || asset.thumbnail_url}
                                            alt=""
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            onError={(e) => ((e.currentTarget as HTMLImageElement).parentElement!.style.display = "none")}
                                        />
                                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors flex items-center justify-center">
                                            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 shadow-2xl">
                                                <ZoomIn className="w-7 h-7 text-gray-900" />
                                            </div>
                                        </div>
                                        <a
                                            href={asset.url || asset.thumbnail_url}
                                            download
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all w-12 h-12 bg-white shadow-2xl rounded-2xl flex items-center justify-center hover:scale-110"
                                        >
                                            <Download className="w-5 h-5 text-indigo-600" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* ── Videos ── */}
                    {activeCategory === "videos" && (
                        talentVideos.length === 0 ? (
                            <EmptyState icon={<Film />} label="No video records found." />
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {talentVideos.map((asset: any, idx: number) => (
                                    <div key={`${asset.asset_id}-${idx}`} className="group relative rounded-[48px] overflow-hidden bg-white border border-gray-100 shadow-2xl shadow-gray-100 transition-all duration-300">
                                        <div className="aspect-video bg-gray-50 flex items-center justify-center relative">
                                            <video
                                                src={asset.url}
                                                className="w-full h-full object-cover"
                                                controls
                                                playsInline
                                            />
                                        </div>
                                        <div className="p-8 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD54F]">Motion Architecture</p>
                                                <p className="text-xl font-black text-gray-900 mt-1 tracking-tight">VOD_COLLECTION_{idx + 1}</p>
                                            </div>
                                            <a
                                                href={asset.url}
                                                download
                                                className="w-14 h-14 bg-gray-50 border border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-100 rounded-[20px] flex items-center justify-center transition-all"
                                            >
                                                <Download className="w-6 h-6" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* ── Voice ── */}
                    {activeCategory === "voice" && (
                        talentVoice.length === 0 ? (
                            <EmptyState icon={<Mic />} label="No vocal specimens available." />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {talentVoice.map((rec: any, idx: number) => {
                                    const recId = rec.recording_id ?? String(idx);
                                    const isPlaying = playingId === recId;
                                    const signedUrl: string = rec.signed_url ?? "";
                                    const emotion = rec.emotion_tag ?? `Vocal Profile ${idx + 1}`;

                                    return (
                                        <div
                                            key={recId}
                                            className={`rounded-[40px] border-2 transition-all duration-500 p-8 flex items-center gap-8 ${isPlaying
                                                ? "border-indigo-100 bg-indigo-50/40 shadow-2xl shadow-indigo-100/50"
                                                : "border-gray-50 bg-white hover:border-gray-100 hover:shadow-2xl hover:shadow-gray-100"
                                                }`}
                                        >
                                            {/* Play btn */}
                                            <button
                                                onClick={() => signedUrl && toggleAudio(recId)}
                                                disabled={!signedUrl}
                                                className={`w-20 h-20 rounded-[24px] flex items-center justify-center shrink-0 transition-all ${isPlaying
                                                    ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-200"
                                                    : signedUrl
                                                        ? "bg-gray-100 text-indigo-600 hover:bg-indigo-100 hover:scale-105"
                                                        : "bg-gray-50 cursor-not-allowed opacity-40 text-gray-300"
                                                    }`}
                                            >
                                                {isPlaying ? (
                                                    <Pause className="w-10 h-10" />
                                                ) : (
                                                    <Play className="w-10 h-10 ml-1.5" />
                                                )}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-2xl font-black text-[#1A1F2C] capitalize tracking-tighter leading-tight">{emotion}</p>
                                                <p className="text-base text-gray-400 font-medium mt-1">
                                                    {rec.mime_type?.split(";")[0]?.toUpperCase() ?? "AUDIO/MP3"} · HQ REPRODUCTION
                                                </p>
                                            </div>

                                            {isPlaying && (
                                                <div className="flex gap-1.5 items-end h-10 shrink-0 pb-1">
                                                    {[1, 3, 2, 4, 1.5, 3.5, 2.5].map((h, i) => (
                                                        <div
                                                            key={i}
                                                            className="w-1.5 bg-indigo-500/50 rounded-full"
                                                            style={{
                                                                height: `${h * 20}%`,
                                                                animation: `waveBounce ${0.6 + i * 0.1}s ease-in-out infinite alternate`,
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-4">
                                                {/* Speed Toggle */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const currentSpeed = playbackSpeeds[recId] || 1;
                                                        const newSpeed = currentSpeed === 1 ? 1.5 : currentSpeed === 1.5 ? 2 : 1;
                                                        setPlaybackSpeeds(prev => ({ ...prev, [recId]: newSpeed }));
                                                        if (audioRefs.current[recId]) {
                                                            audioRefs.current[recId]!.playbackRate = newSpeed;
                                                        }
                                                    }}
                                                    className={`h-10 px-3 rounded-xl border flex items-center gap-2 transition-all ${(playbackSpeeds[recId] || 1) !== 1
                                                        ? "border-indigo-200 bg-indigo-50 text-indigo-600 font-black"
                                                        : "border-gray-100 text-gray-400 hover:border-gray-200"
                                                        }`}
                                                >
                                                    <FastForward className="w-4 h-4" />
                                                    <span className="text-xs">{playbackSpeeds[recId] || 1}x</span>
                                                </button>

                                                {/* Download */}
                                                <a
                                                    href={signedUrl}
                                                    download={`${emotion.replace(/\s+/g, '_')}.mp3`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                                                >
                                                    <Download className="w-5 h-5" />
                                                </a>
                                            </div>

                                            <audio
                                                ref={(el) => {
                                                    audioRefs.current[recId] = el;
                                                    if (el) el.playbackRate = playbackSpeeds[recId] || 1;
                                                }}
                                                src={signedUrl}
                                                onEnded={() => setPlayingId(null)}
                                                onPlay={() => {
                                                    if (playingId && playingId !== recId) audioRefs.current[playingId]?.pause();
                                                    setPlayingId(recId);
                                                }}
                                                onPause={() => { if (playingId === recId) setPlayingId(null); }}
                                                className="hidden"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                </div>
            )}

            {/* ── FOOTER ── */}
            <footer className="border-t border-gray-50 mt-20 py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="mb-10 opacity-20 hover:opacity-100 transition-opacity duration-500">
                        <LikeleeLogoMark className="justify-center grayscale" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300 mb-10">Premium Talent Repository</p>
                    <div className="flex justify-center gap-12 text-[11px] font-bold text-gray-300 uppercase tracking-widest">
                        <span>Digital Assets</span>
                        <span>Cinema Logistics</span>
                        <span>Vocal Synth</span>
                    </div>
                    <p className="text-[11px] text-gray-200 mt-20">
                        All assets are subject to license agreements. Unauthorized reproduction is strictly prohibited.<br />
                        Developed for professional workflow optimization. © {new Date().getFullYear()} Likelee Labs.
                    </p>
                </div>
            </footer>

            <style>{`
                @keyframes waveBounce {
                    from { height: 20%; transform: translateY(0); }
                    to   { height: 100%; transform: translateY(-2px); }
                }
            `}</style>

            {/* ═══ LIGHTBOX ═══ */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-50 bg-white/95 backdrop-blur-3xl flex items-center justify-center p-8"
                    onClick={() => setLightboxUrl(null)}
                >
                    <button
                        className="absolute top-10 right-10 w-16 h-16 bg-gray-900 rounded-[20px] flex items-center justify-center text-white hover:bg-black transition-all z-10 shadow-2xl"
                        onClick={() => setLightboxUrl(null)}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <div className="relative max-w-full h-full flex flex-col items-center justify-center pt-10">
                        <img
                            src={lightboxUrl}
                            alt=""
                            className="max-w-full max-h-[80vh] rounded-[48px] shadow-[0_80px_160px_-40px_rgba(0,0,0,0.2)] object-contain mb-10"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <a
                            href={lightboxUrl}
                            download
                            className="flex items-center gap-3 px-10 py-4 bg-gray-900 text-white rounded-[24px] font-black shadow-2xl hover:bg-black transition-all scale-100 hover:scale-105 active:scale-95"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Download className="w-6 h-6" /> Download Original Content
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="text-center py-32 bg-white border-2 border-dashed border-gray-50 rounded-[64px] shadow-inner shadow-gray-50">
            <div className="inline-flex w-24 h-24 bg-gray-50 rounded-full items-center justify-center mx-auto mb-8 text-gray-100">
                {React.cloneElement(icon as React.ReactElement, { className: "w-12 h-12" })}
            </div>
            <p className="text-xl font-bold text-gray-200 tracking-tight">{label}</p>
        </div>
    );
}
