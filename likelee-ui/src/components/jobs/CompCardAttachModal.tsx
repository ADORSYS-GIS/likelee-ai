import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Layout, Check } from "lucide-react";
import {
  CompCardExportFormat,
  PublicUploadMeta,
  generateAndUploadCompCard,
} from "@/lib/compCardEngine";
import { supabase } from "@/lib/supabase";
import { getAgencyRoster } from "@/api/functions";

type CompCardTalent = {
  id: string;
  name?: string;
  full_name?: string;
  display_name?: string;
  profile_photo_url?: string;
  img?: string;
  height_feet?: number | string | null;
  height_inches?: number | string | null;
  height?: string | null;
  gender_identity?: string | null;
  bust_inches?: number | string | null;
  waist_inches?: number | string | null;
  hips_inches?: number | string | null;
  measurements?: string | null;
  eye_color?: string | null;
  hair_color?: string | null;
  email?: string | null;
  phone?: string | null;
};

export default function CompCardAttachModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talent: CompCardTalent | null;
  mode?: "self" | "agency";
  onAttached: (meta: PublicUploadMeta) => void;
}) {
  const { open, onOpenChange, talent, mode = "self", onAttached } = props;
  const { t } = useTranslation("agency");
  const [selectedTemplate, setSelectedTemplate] = useState<
    "classic" | "modern" | "minimal"
  >("classic");
  const [selectedExportFormat, setSelectedExportFormat] =
    useState<CompCardExportFormat>("pdf");
  const [attaching, setAttaching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const previewNodeRef = useRef<HTMLDivElement | null>(null);

  const [rosterLoading, setRosterLoading] = useState(false);
  const [roster, setRoster] = useState<CompCardTalent[]>([]);
  const [talentSearch, setTalentSearch] = useState("");
  const [selectedTalentId, setSelectedTalentId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    if (mode !== "agency") return;

    setRosterLoading(true);
    (async () => {
      try {
        const resp: any = await getAgencyRoster();
        const talents = Array.isArray(resp)
          ? resp
          : Array.isArray(resp?.talents)
            ? resp.talents
            : Array.isArray(resp?.data?.talents)
              ? resp.data.talents
              : [];
        setRoster(Array.isArray(talents) ? talents : []);
      } finally {
        setRosterLoading(false);
      }
    })();
  }, [open, mode]);

  useEffect(() => {
    if (!open) {
      setTalentSearch("");
      setSelectedTalentId("");
      setErrorMessage("");
    }
  }, [open]);

  const effectiveTalent = useMemo(() => {
    if (mode !== "agency") return talent;
    const id = selectedTalentId.trim();
    if (!id) return null;
    return roster.find((t) => String((t as any)?.id || "") === id) || null;
  }, [mode, roster, selectedTalentId, talent]);

  const filteredRoster = useMemo(() => {
    const q = talentSearch.trim().toLowerCase();
    const arr = Array.isArray(roster) ? roster : [];
    if (!q) return arr;
    return arr.filter((t: any) => {
      const name = String(
        t?.stage_name || t?.name || t?.full_name || t?.display_name || "",
      ).toLowerCase();
      const email = String(t?.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [roster, talentSearch]);

  const previewTalentComputed = useMemo(() => {
    const t = effectiveTalent;
    if (!t) return null;

    const nameRaw =
      String(
        t?.name ||
          t?.full_name ||
          t?.display_name ||
          (t as any)?.stage_name ||
          "",
      )
        .trim()
        .toUpperCase() || "TALENT";

    const genderRaw = String(t?.gender_identity || "")
      .trim()
      .toLowerCase();
    const isMale = (() => {
      if (!genderRaw) return false;
      if (genderRaw.includes("female") || genderRaw.includes("woman"))
        return false;
      if (genderRaw === "male" || genderRaw === "man" || genderRaw === "m")
        return true;
      if (/\bmale\b/.test(genderRaw) || /\bman\b/.test(genderRaw)) return true;
      if (genderRaw.includes("masc")) return true;
      return false;
    })();

    const ftRaw = Number((t as any)?.height_feet);
    const inchRaw = Number((t as any)?.height_inches);
    const hasFt = Number.isFinite(ftRaw) && ftRaw > 0;
    const hasIn = Number.isFinite(inchRaw) && inchRaw >= 0;
    const height =
      hasFt || hasIn
        ? `${hasFt ? ftRaw : 0}'${hasIn ? inchRaw : 0}"`
        : (t as any)?.height || null;

    const bustRaw = (t as any)?.bust_inches;
    const waistRaw = (t as any)?.waist_inches;
    const hipsRaw = (t as any)?.hips_inches;

    const bust =
      !isMale && bustRaw !== undefined && bustRaw !== null && bustRaw !== ""
        ? String(bustRaw)
        : null;
    const waist =
      !isMale && waistRaw !== undefined && waistRaw !== null && waistRaw !== ""
        ? String(waistRaw)
        : null;
    const hips =
      !isMale && hipsRaw !== undefined && hipsRaw !== null && hipsRaw !== ""
        ? String(hipsRaw)
        : null;

    const measurements =
      !isMale && bust && waist && hips
        ? `${bust}-${waist}-${hips}`
        : !isMale
          ? (t as any)?.measurements || null
          : null;

    return {
      ...t,
      name: nameRaw,
      img: (t as any)?.img || (t as any)?.profile_photo_url || undefined,
      _cc_height: height,
      _cc_bust: bust,
      _cc_waist: waist,
      _cc_hips: hips,
      _cc_measurements: measurements,
      _cc_is_male: isMale,
    } as any;
  }, [effectiveTalent]);

  const needsSelection = mode === "agency" && !selectedTalentId.trim();

  const onAttach = async () => {
    if (!previewTalentComputed) return;
    if (!supabase) throw new Error("Supabase not configured");
    const node = previewNodeRef.current;
    if (!node) return;

    setAttaching(true);
    setErrorMessage("");
    try {
      const session = await supabase.auth.getSession();
      const userId = String(session.data.session?.user?.id || "applicant");
      const talentId = String(previewTalentComputed.id || "unknown");
      const filenameBase = String(previewTalentComputed.name || "CompCard");

      const meta = await generateAndUploadCompCard({
        supabase,
        node,
        format: selectedExportFormat,
        userId,
        talentId,
        filenameBase,
        prefix: "job-comp-cards",
      });

      onAttached(meta);
      onOpenChange(false);
      setErrorMessage("");
    } catch (e) {
      setErrorMessage(
        String((e as any)?.message || "Failed to attach comp card"),
      );
    } finally {
      setAttaching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] lg:max-w-5xl h-[92vh] lg:h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-2">
          <DialogTitle className="text-2xl font-bold">
            {t("agencyDashboard.compCard.title")}
          </DialogTitle>
          <DialogDescription>
            {t("agencyDashboard.compCard.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col p-4 sm:p-6 space-y-6 overflow-y-auto">
            {mode === "agency" && (
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-900">
                  Select talent
                </label>
                <Input
                  value={talentSearch}
                  onChange={(e) => setTalentSearch(e.target.value)}
                  placeholder="Search by name or email"
                />
                <div className="rounded-xl border border-gray-200">
                  <ScrollArea className="h-56 p-2">
                    {rosterLoading ? (
                      <div className="p-3 text-sm text-gray-500">
                        Loading roster...
                      </div>
                    ) : filteredRoster.length > 0 ? (
                      <div className="space-y-1">
                        {filteredRoster.map((t: any) => {
                          const id = String(t?.id || "");
                          const name = String(
                            t?.stage_name ||
                              t?.name ||
                              t?.full_name ||
                              t?.display_name ||
                              "Talent",
                          );
                          if (!id) return null;
                          return (
                            <div
                              key={id}
                              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                              onClick={() => setSelectedTalentId(id)}
                            >
                              <Checkbox
                                checked={selectedTalentId === id}
                                onCheckedChange={() => setSelectedTalentId(id)}
                              />
                              <img
                                src={
                                  t?.img ||
                                  t?.profile_photo_url ||
                                  "https://placehold.co/150"
                                }
                                alt={name}
                                className="w-8 h-8 rounded-md object-cover"
                                crossOrigin="anonymous"
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-700 truncate">
                                  {name}
                                </div>
                                {t?.email && (
                                  <div className="text-[11px] text-gray-500 truncate">
                                    {String(t.email)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 text-sm text-gray-500">
                        No talent found.
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-900">
                Choose Template
              </label>
              <div className="grid grid-cols-1 gap-3">
                {(
                  [
                    {
                      id: "classic",
                      title: "Classic Layout",
                      desc: "Traditional comp card with 5 photos",
                    },
                    {
                      id: "modern",
                      title: "Modern Layout",
                      desc: "Clean, contemporary design",
                    },
                    {
                      id: "minimal",
                      title: "Minimal Layout",
                      desc: "Simple, elegant style",
                    },
                  ] as const
                ).map((t) => (
                  <div
                    key={t.id}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedTemplate === t.id
                        ? "border-purple-600 bg-purple-50"
                        : "border-gray-200 hover:border-purple-200"
                    }`}
                    onClick={() => setSelectedTemplate(t.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <Layout className="w-5 h-5 text-gray-700" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">
                          {t.title}
                        </p>
                        <p className="text-xs text-gray-500">{t.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-bold text-gray-900">
                Export format
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "pdf", title: "PDF", desc: "Print-ready" },
                    { id: "jpeg", title: "JPEG", desc: "Digital" },
                  ] as const
                ).map((f) => (
                  <div
                    key={f.id}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedExportFormat === f.id
                        ? "border-purple-600 bg-purple-50"
                        : "border-gray-200 hover:border-purple-200"
                    }`}
                    onClick={() => setSelectedExportFormat(f.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          {f.title}
                        </div>
                        <div className="text-xs text-gray-500">{f.desc}</div>
                      </div>
                      {selectedExportFormat === f.id && (
                        <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={onAttach}
              disabled={!previewTalentComputed || attaching || needsSelection}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-purple-100"
            >
              {attaching ? "Attaching..." : "Attach comp card"}
            </Button>

            {errorMessage && (
              <div className="text-xs text-red-600 break-words">
                {errorMessage}
              </div>
            )}

            {mode === "agency" && needsSelection && (
              <div className="text-xs text-gray-500">
                Select a talent above to generate their comp card.
              </div>
            )}
          </div>

          <div className="w-full lg:flex-1 bg-gray-50 p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center overflow-y-auto">
            <div className="flex justify-between w-full max-w-md mb-3 sm:mb-4">
              <h3 className="font-bold text-gray-500 text-sm">Preview</h3>
            </div>

            {previewTalentComputed ? (
              <div
                ref={previewNodeRef}
                className={`w-full max-w-md bg-white shadow-2xl overflow-hidden relative group transition-all aspect-[4/5] ${
                  selectedTemplate === "minimal" ? "border border-gray-100" : ""
                }`}
              >
                {selectedTemplate === "classic" && (
                  <div className="flex flex-col h-full bg-white">
                    <div className="grid grid-cols-2 flex-grow overflow-hidden relative">
                      <div className="col-span-1 h-full relative border-r border-white/10">
                        <img
                          src={
                            previewTalentComputed.img ||
                            "https://placehold.co/600x800"
                          }
                          className="w-full h-full object-cover object-top"
                          alt={previewTalentComputed.name}
                          crossOrigin="anonymous"
                        />
                      </div>
                      <div className="col-span-1 grid grid-cols-2 grid-rows-2 h-full">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className="relative border-b border-r border-white/10 overflow-hidden"
                          >
                            <img
                              src={
                                previewTalentComputed.img ||
                                "https://placehold.co/300x400"
                              }
                              className="w-full h-full object-cover object-top opacity-90"
                              alt=""
                              crossOrigin="anonymous"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="w-full bg-white p-4 border-t border-gray-100 flex justify-between items-end shrink-0">
                      <div>
                        <h2 className="font-black text-2xl uppercase tracking-tighter leading-none">
                          {previewTalentComputed.name}
                        </h2>
                        <div className="text-[10px] uppercase font-bold text-gray-500 flex flex-wrap gap-3 mt-2 tracking-wide">
                          <span>
                            Height: {previewTalentComputed._cc_height || "--"}
                          </span>
                          {!previewTalentComputed._cc_is_male && (
                            <span>
                              Measurements:{" "}
                              {previewTalentComputed._cc_measurements || "--"}
                            </span>
                          )}
                          <span>
                            Eyes: {previewTalentComputed.eye_color || "--"}
                          </span>
                          <span>
                            Hair: {previewTalentComputed.hair_color || "--"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xs uppercase tracking-wider">
                          Likelee
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTemplate === "modern" && (
                  <div className="w-full h-full relative">
                    <img
                      src={
                        previewTalentComputed.img ||
                        "https://placehold.co/800x1000"
                      }
                      className="w-full h-full object-cover"
                      alt={previewTalentComputed.name}
                      crossOrigin="anonymous"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-8 text-white">
                      <h1 className="text-4xl font-black uppercase tracking-tighter leading-[0.95] break-words max-w-full mb-4">
                        {previewTalentComputed.name}
                      </h1>
                      <div className="flex flex-wrap gap-x-8 gap-y-4 text-xs font-bold uppercase tracking-widest opacity-90">
                        <div>
                          <p className="text-white/50 text-[9px] mb-0.5 font-normal">
                            Height
                          </p>
                          <p>{previewTalentComputed._cc_height || "--"}</p>
                        </div>
                        {!previewTalentComputed._cc_is_male && (
                          <div>
                            <p className="text-white/50 text-[9px] mb-0.5 font-normal">
                              Measurements
                            </p>
                            <p>
                              {previewTalentComputed._cc_measurements || "--"}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-white/50 text-[9px] mb-0.5 font-normal">
                            Eyes
                          </p>
                          <p>{previewTalentComputed.eye_color || "--"}</p>
                        </div>
                        <div>
                          <p className="text-white/50 text-[9px] mb-0.5 font-normal">
                            Hair
                          </p>
                          <p>{previewTalentComputed.hair_color || "--"}</p>
                        </div>
                      </div>
                      <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-end opacity-60">
                        <div>
                          <p className="font-bold text-sm tracking-widest uppercase">
                            Likelee
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTemplate === "minimal" && (
                  <div className="flex h-full">
                    <div className="w-2/3 h-full bg-gray-100">
                      <img
                        src={
                          previewTalentComputed.img ||
                          "https://placehold.co/800x1000"
                        }
                        className="w-full h-full object-cover"
                        alt={previewTalentComputed.name}
                        crossOrigin="anonymous"
                      />
                    </div>
                    <div className="w-1/3 h-full bg-white p-6 flex flex-col border-l border-gray-100 min-w-0">
                      <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-5 leading-[0.95] break-words">
                        {previewTalentComputed.name}
                      </h2>

                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                            Height
                          </p>
                          <p className="font-bold text-sm text-gray-900">
                            {previewTalentComputed._cc_height || "--"}
                          </p>
                        </div>
                        {!previewTalentComputed._cc_is_male && (
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                              Measurements
                            </p>
                            <p className="font-bold text-sm text-gray-900">
                              {previewTalentComputed._cc_measurements || "--"}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                            Eyes
                          </p>
                          <p className="font-bold text-sm text-gray-900">
                            {previewTalentComputed.eye_color || "--"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                            Hair
                          </p>
                          <p className="font-bold text-sm text-gray-900">
                            {previewTalentComputed.hair_color || "--"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto pt-6 border-t border-gray-100 min-w-0">
                        <p className="font-bold text-xs text-gray-900 tracking-wider uppercase">
                          Likelee
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <p>Loading your profile…</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
