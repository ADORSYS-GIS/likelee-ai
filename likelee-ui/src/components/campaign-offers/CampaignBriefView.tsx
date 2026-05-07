import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Download, FileDown, X } from "lucide-react";
import { generateBriefPDF } from "@/services/BriefPDFService";

export function CampaignBriefView({
  brief,
  brandName = "Brand",
  campaignName = "Campaign Brief",
}: {
  brief: any;
  brandName?: string;
  campaignName?: string;
}) {
  const { t } = useTranslation("brand");

  const notSpecified = t("campaigns.myOffers.notSpecified");

  const briefValue = (key: string, fallback = notSpecified) => {
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

  const referenceImageUrls = useMemo(
    () =>
      referenceImages
        .map((img: any) => String(img?.url || "").trim())
        .filter(Boolean),
    [referenceImages],
  );

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxUrl =
    lightboxIndex === null ? null : referenceImageUrls[lightboxIndex] || null;

  const closeLightbox = () => setLightboxIndex(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setLightboxIndex((prev) => {
          if (prev === null) return prev;
          const total = referenceImageUrls.length;
          if (total <= 1) return prev;
          return (prev - 1 + total) % total;
        });
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setLightboxIndex((prev) => {
          if (prev === null) return prev;
          const total = referenceImageUrls.length;
          if (total <= 1) return prev;
          return (prev + 1) % total;
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex, referenceImageUrls.length]);

  return (
    <div className="space-y-6">
      {/* Header Grid: Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            {t("campaigns.campaignBriefBuilder.fields.voice")}
          </p>
          <p className="text-sm font-semibold text-slate-900">
            {briefValue("voice")}
          </p>
        </div>
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            {t("campaigns.campaignBriefBuilder.fields.tone")}
          </p>
          <p className="text-sm font-semibold text-slate-900">
            {briefValue("tone")}
          </p>
        </div>
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            {t("campaigns.campaignBriefBuilder.fields.personality")}
          </p>
          <p className="text-sm font-semibold text-slate-900">
            {briefValue("personality")}
          </p>
        </div>
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            {t("campaigns.campaignBriefBuilder.fields.campaignDuration")}
          </p>
          <p className="text-sm font-semibold text-slate-900">
            {briefValue("overview_campaign_duration")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Brief Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-2 sm:p-4 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
              {t("campaigns.campaignBriefBuilder.sections.generalDialogue")}
            </h2>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                {t("campaigns.campaignBriefBuilder.fields.keyMessages")}
              </h3>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                {briefLines("key_messages").length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-slate-900">
                    {briefLines("key_messages").map((line, idx) => (
                      <li key={`key-message-${idx}`} className="text-sm">
                        {line.replace(/^[•-]\s*/, "")}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    {notSpecified}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                {t("campaigns.campaignBriefBuilder.fields.scriptGuidelines")}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    {t("campaigns.campaignBriefBuilder.fields.opening")}
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {briefValue("script_opening")}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    {t("campaigns.campaignBriefBuilder.fields.middle")}
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {briefValue("script_middle")}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    {t("campaigns.campaignBriefBuilder.fields.closing")}
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {briefValue("script_closing")}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
                  ✓ {t("campaigns.campaignBriefBuilder.fields.do")}
                </p>
                {briefLines("dos").length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-emerald-900">
                    {briefLines("dos").map((line, idx) => (
                      <li key={`dos-${idx}`} className="text-sm">
                        {line.replace(/^[•-]\s*/, "")}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-emerald-600 italic">
                    {notSpecified}
                  </p>
                )}
              </div>
              <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">
                  ✗ {t("campaigns.campaignBriefBuilder.fields.dont")}
                </p>
                {briefLines("donts").length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-red-900">
                    {briefLines("donts").map((line, idx) => (
                      <li key={`donts-${idx}`} className="text-sm">
                        {line.replace(/^[•-]\s*/, "")}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-red-600 italic">{notSpecified}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-2 sm:p-4 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              {t("campaigns.campaignBriefBuilder.sections.visualGuide")}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-xs font-bold text-slate-500 mb-1">
                  {t("campaigns.campaignBriefBuilder.fields.deliverables")}
                </p>
                <p className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
                  {briefValue("deliverables_reels")}
                </p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-xs font-bold text-slate-500 mb-1">
                  {t("campaigns.campaignBriefBuilder.fields.heroImage")}
                </p>
                <p className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
                  {briefValue("deliverables_hero_image")}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                {t("campaigns.campaignBriefBuilder.fields.styleAesthetic")}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-50 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    {t("campaigns.campaignBriefBuilder.fields.palette")}
                  </p>
                  <p className="text-xs font-medium text-slate-700 truncate">
                    {briefValue("visual_color_palette")}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-50 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    {t("campaigns.campaignBriefBuilder.fields.setting")}
                  </p>
                  <p className="text-xs font-medium text-slate-700 truncate">
                    {briefValue("visual_setting")}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-50 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    {t("campaigns.campaignBriefBuilder.fields.framing")}
                  </p>
                  <p className="text-xs font-medium text-slate-700 truncate">
                    {briefValue("visual_framing")}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-50 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    {t("campaigns.campaignBriefBuilder.fields.editing")}
                  </p>
                  <p className="text-xs font-medium text-slate-700 truncate">
                    {briefValue("visual_editing")}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                {t("campaigns.campaignBriefBuilder.fields.referenceImages")}
              </h3>
              {referenceImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {referenceImages.map((img: any, idx: number) => (
                    <div
                      key={`ref-img-${idx}`}
                      className="group relative border border-gray-100 rounded-xl overflow-hidden cursor-pointer aspect-square"
                      onClick={() => {
                        const url = String(img?.url || "").trim();
                        const index = referenceImageUrls.indexOf(url);
                        setLightboxIndex(index >= 0 ? index : idx);
                      }}
                    >
                      <img
                        src={String(img?.url || "")}
                        alt={`Ref ${idx + 1}`}
                        className="w-full h-full object-cover bg-gray-50 transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-black/40 backdrop-blur-sm text-[10px] text-white truncate">
                        {`Ref ${idx + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                  {t("campaigns.campaignBriefBuilder.noReferenceImages", {
                    defaultValue: "No reference images provided.",
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                {t("campaigns.campaignBriefBuilder.fields.brandAssets")}
              </h3>
              {brandAssets.length > 0 ? (
                <div className="space-y-1.5 mt-2">
                  {brandAssets.map((asset: any, idx: number) => (
                    <div
                      key={`asset-${idx}`}
                      className="p-2 bg-white border border-slate-100 rounded-lg flex items-center justify-between gap-2"
                    >
                      <span className="text-[10px] font-medium text-slate-700 truncate">
                        {String(asset?.name || `Asset ${idx + 1}`)}
                      </span>
                      {asset?.url && (
                        <a
                          href={String(asset.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  {t("campaigns.campaignBriefBuilder.noAssetsProvided", {
                    defaultValue: "No assets provided.",
                  })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Scope & Contract Summary */}
        <div className="space-y-6">
          <div className="p-2 sm:p-4 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-amber-500 rounded-full" />
              {t("campaigns.campaignBriefBuilder.sections.scopeDetails")}
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    {t("campaigns.campaignBriefBuilder.fields.objective")}
                  </p>
                  <p className="text-xs font-medium text-slate-900">
                    {briefValue("overview_objective")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    {t("campaigns.campaignBriefBuilder.fields.targetAudience")}
                  </p>
                  <p className="text-xs font-medium text-slate-900">
                    {briefValue("overview_target_audience")}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 pt-1">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      {t("campaigns.campaignDetails.budget")}
                    </p>
                    <p className="text-xs font-bold text-slate-900">
                      {briefValue("budget_total")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      {t("campaigns.campaignBriefBuilder.fields.launchDate")}
                    </p>
                    <p className="text-xs font-bold text-slate-900">
                      {briefValue("overview_launch_date")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                  {t("campaigns.campaignBriefBuilder.fields.revisionPolicy")}
                </p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-700">
                    {t(
                      "campaigns.campaignBriefBuilder.fields.includedRevisions",
                    )}
                  </span>
                  <span className="font-bold text-amber-900">
                    {briefValue("revision_included")}
                  </span>
                </div>
                <div className="text-[10px] text-amber-600 leading-tight">
                  <span className="font-semibold italic">
                    {t(
                      "campaigns.campaignBriefBuilder.fields.revisionTurnaround",
                    )}
                    :
                  </span>{" "}
                  {briefValue("revision_turnaround")}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {t("campaigns.campaignBriefBuilder.fields.approvalProcess")}
                </p>
                {briefLines("approval_process").length > 0 ? (
                  <ol className="list-decimal pl-4 space-y-1.5">
                    {briefLines("approval_process").map((line, idx) => (
                      <li
                        key={`approval-${idx}`}
                        className="text-[11px] text-slate-700 leading-tight font-medium"
                      >
                        {line.replace(/^[•-]?\s*\d*\s*/, "")}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    {notSpecified}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => generateBriefPDF(brief, brandName, campaignName)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                <FileDown className="w-4 h-4" />
                {t("campaigns.campaignDetails.downloadBriefPdf")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {lightboxUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm"
            onClick={closeLightbox}
          />
          <div className="relative z-10 w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="text-sm font-bold text-slate-900">
                {lightboxIndex !== null
                  ? `Reference ${lightboxIndex + 1} of ${referenceImageUrls.length}`
                  : "Reference"}
              </div>
              <button
                type="button"
                className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                onClick={closeLightbox}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative bg-slate-50 flex items-center justify-center">
              <img
                src={lightboxUrl}
                alt="Reference"
                className="max-w-full max-h-[75vh] object-contain"
              />
              {referenceImageUrls.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/80 hover:bg-white backdrop-blur shadow-lg rounded-full inline-flex items-center justify-center transition-all"
                    onClick={() =>
                      setLightboxIndex((prev) => {
                        if (prev === null) return prev;
                        const total = referenceImageUrls.length;
                        return (prev - 1 + total) % total;
                      })
                    }
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/80 hover:bg-white backdrop-blur shadow-lg rounded-full inline-flex items-center justify-center transition-all"
                    onClick={() =>
                      setLightboxIndex((prev) => {
                        if (prev === null) return prev;
                        const total = referenceImageUrls.length;
                        return (prev + 1) % total;
                      })
                    }
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
