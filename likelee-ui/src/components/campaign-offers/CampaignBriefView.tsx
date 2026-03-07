import React from "react";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";

export function CampaignBriefView({ brief }: { brief: any }) {
    const briefValue = (key: string, fallback = "Not specified") => {
        const value = brief?.[key];
        if (value === null || value === undefined) return fallback;
        const text = String(value).trim();
        return text.length > 0 ? text : fallback;
    };

    const briefLines = (key: string): string[] => {
        const raw = briefValue(key, "");
        if (!raw) return [];
        return raw
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
    };

    const referenceImages = Array.isArray(brief?.reference_images)
        ? brief.reference_images
        : [];
    const brandAssets = Array.isArray(brief?.brand_assets)
        ? brief.brand_assets
        : [];

    return (
        <>
            <Card className="p-6 bg-white border border-gray-200 space-y-6 rounded-none">
                <h2 className="text-2xl font-bold text-slate-900">
                    General Dialogue &amp; Voice Direction
                </h2>
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-800">
                        Brand Voice &amp; Tone
                    </h3>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-2">
                        <p className="text-slate-900">
                            <span className="font-semibold">Voice:</span> {briefValue("voice")}
                        </p>
                        <p className="text-slate-900">
                            <span className="font-semibold">Tone:</span> {briefValue("tone")}
                        </p>
                        <p className="text-slate-900">
                            <span className="font-semibold">Personality:</span>{" "}
                            {briefValue("personality")}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-800">Key Messages</h3>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-none">
                        {briefLines("key_messages").length > 0 ? (
                            <ul className="list-disc pl-5 space-y-1 text-slate-900">
                                {briefLines("key_messages").map((line, idx) => (
                                    <li key={`key-message-${idx}`}>{line.replace(/^[•-]\s*/, "")}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-slate-500">Not specified</p>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-800">
                        Script Guidelines (For Video/Audio)
                    </h3>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-2">
                        <p className="text-slate-900">
                            <span className="font-semibold">Opening (0-5s):</span>{" "}
                            {briefValue("script_opening")}
                        </p>
                        <p className="text-slate-900">
                            <span className="font-semibold">Middle (5-20s):</span>{" "}
                            {briefValue("script_middle")}
                        </p>
                        <p className="text-slate-900">
                            <span className="font-semibold">Closing (20-30s):</span>{" "}
                            {briefValue("script_closing")}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-800">Do&apos;s &amp; Don&apos;ts</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-none">
                            <p className="font-semibold text-emerald-900 mb-2">✓ DO:</p>
                            {briefLines("dos").length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1 text-emerald-900">
                                    {briefLines("dos").map((line, idx) => (
                                        <li key={`dos-${idx}`}>{line.replace(/^[•-]\s*/, "")}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-emerald-700">Not specified</p>
                            )}
                        </div>
                        <div className="p-4 bg-red-50 border border-red-200 rounded-none">
                            <p className="font-semibold text-red-900 mb-2">✗ DON&apos;T:</p>
                            {briefLines("donts").length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1 text-red-900">
                                    {briefLines("donts").map((line, idx) => (
                                        <li key={`donts-${idx}`}>{line.replace(/^[•-]\s*/, "")}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-red-700">Not specified</p>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-6 bg-white border border-gray-200 space-y-6 rounded-none">
                <h2 className="text-2xl font-bold text-slate-900">
                    Visual Requirements &amp; Style Guide
                </h2>
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-800">Required Deliverables</h3>
                    <div className="space-y-3">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-none">
                            <p className="font-semibold text-slate-900 mb-1">Instagram Reels</p>
                            <p className="text-slate-900 whitespace-pre-wrap">
                                {briefValue("deliverables_reels")}
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-none">
                            <p className="font-semibold text-slate-900 mb-1">Hero Image</p>
                            <p className="text-slate-900 whitespace-pre-wrap">
                                {briefValue("deliverables_hero_image")}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-800">Visual Style &amp; Aesthetic</h3>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-2">
                        <p className="text-slate-900">
                            <span className="font-semibold">Color Palette:</span>{" "}
                            {briefValue("visual_color_palette")}
                        </p>
                        <p className="text-slate-900">
                            <span className="font-semibold">Setting:</span>{" "}
                            {briefValue("visual_setting")}
                        </p>
                        <p className="text-slate-900">
                            <span className="font-semibold">Framing:</span>{" "}
                            {briefValue("visual_framing")}
                        </p>
                        <p className="text-slate-900">
                            <span className="font-semibold">Editing:</span>{" "}
                            {briefValue("visual_editing")}
                        </p>
                    </div>
                </div>
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-800">Reference Images</h3>
                    {referenceImages.length > 0 ? (
                        <div className="grid md:grid-cols-3 gap-3">
                            {referenceImages.map((img: any, idx: number) => (
                                <div key={`ref-img-${idx}`} className="border border-gray-200 rounded-none overflow-hidden">
                                    <img
                                        src={String(img?.url || "")}
                                        alt={`Ref ${idx + 1}`}
                                        className="w-full h-40 object-cover bg-gray-100"
                                    />
                                    <div className="p-2 text-xs text-gray-700 truncate">
                                        {`Ref ${idx + 1}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-none text-slate-500">
                            No reference images provided.
                        </div>
                    )}
                </div>
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-800">Brand Assets Provided</h3>
                    {brandAssets.length > 0 ? (
                        <div className="space-y-2">
                            {brandAssets.map((asset: any, idx: number) => (
                                <div
                                    key={`asset-${idx}`}
                                    className="p-3 bg-slate-50 border border-slate-200 rounded-none text-slate-900 flex items-center justify-between gap-3"
                                >
                                    <span className="truncate">
                                        {String(asset?.name || `Asset ${idx + 1}`)}
                                    </span>
                                    {asset?.url ? (
                                        <a
                                            href={String(asset.url)}
                                            target="_blank"
                                            rel="noreferrer"
                                            download={String(asset?.name || `asset-${idx + 1}`)}
                                            title="Download file"
                                            className="inline-flex items-center justify-center w-9 h-9 border border-slate-300 rounded-none hover:bg-slate-100 transition-colors"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                    ) : (
                                        <span className="text-xs text-slate-500">No file URL</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-none text-slate-500">
                            No brand assets provided.
                        </div>
                    )}
                </div>
            </Card>

            <Card className="p-6 bg-white border border-gray-200 space-y-6 rounded-none">
                <h2 className="text-2xl font-bold text-slate-900">
                    Campaign Scope &amp; Contract Details
                </h2>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-2">
                        <p className="text-slate-900">
                            <span className="font-semibold">Objective:</span>{" "}
                            {briefValue("overview_objective")}
                        </p>
                        <p className="text-slate-900">
                            <span className="font-semibold">Target Audience:</span>{" "}
                            {briefValue("overview_target_audience")}
                        </p>
                        <p className="text-slate-900">
                            <span className="font-semibold">Campaign Duration:</span>{" "}
                            {briefValue("overview_campaign_duration")}
                        </p>
                        <p className="text-slate-900">
                            <span className="font-semibold">Launch Date:</span>{" "}
                            {briefValue("overview_launch_date")}
                        </p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-2">
                        <p className="text-slate-900">
                            <span className="font-semibold">Total Budget:</span>{" "}
                            {briefValue("budget_total")}
                        </p>
                        <p className="text-slate-900">
                            <span className="font-semibold">Creator Payment:</span>{" "}
                            {briefValue("budget_creator_payment")}
                        </p>
                        <p className="text-slate-900">
                            <span className="font-semibold">Platform Fee:</span>{" "}
                            {briefValue("budget_platform_fee")}
                        </p>
                        <p className="text-slate-900">
                            <span className="font-semibold">Submission Deadline:</span>{" "}
                            {briefValue("budget_submission_deadline")}
                        </p>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-none">
                    <p className="text-slate-900">
                        <span className="font-semibold">Renewal Terms:</span>{" "}
                        {briefValue("budget_renewal_terms")}
                    </p>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-none space-y-2">
                    <p className="text-slate-900">
                        <span className="font-semibold">Included Revisions:</span>{" "}
                        {briefValue("revision_included")}
                    </p>
                    <p className="text-slate-900">
                        <span className="font-semibold">Major Changes:</span>{" "}
                        {briefValue("revision_major_changes")}
                    </p>
                    <p className="text-slate-900">
                        <span className="font-semibold">Turnaround for Revisions:</span>{" "}
                        {briefValue("revision_turnaround")}
                    </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-none">
                    <p className="font-semibold text-slate-900 mb-2">Approval Process</p>
                    {briefLines("approval_process").length > 0 ? (
                        <ol className="list-decimal pl-5 space-y-1 text-slate-900">
                            {briefLines("approval_process").map((line, idx) => (
                                <li key={`approval-${idx}`}>{line.replace(/^[•-]?\s*\d*\s*/, "")}</li>
                            ))}
                        </ol>
                    ) : (
                        <p className="text-slate-500">Not specified</p>
                    )}
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-none">
                    <p className="font-semibold text-slate-900 mb-1">Watermark &amp; Protection</p>
                    <p className="text-slate-900 whitespace-pre-wrap">
                        {briefValue("watermark_protection")}
                    </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-none">
                    <p className="font-semibold text-slate-900 mb-1">Legal Terms</p>
                    {briefLines("legal_terms").length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1 text-slate-900">
                            {briefLines("legal_terms").map((line, idx) => (
                                <li key={`legal-${idx}`}>{line.replace(/^[•-]\s*/, "")}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-500">Not specified</p>
                    )}
                </div>
            </Card>
        </>
    );
}
