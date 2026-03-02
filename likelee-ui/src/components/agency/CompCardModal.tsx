import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Layout, Check } from "lucide-react";
import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";
import { listAgencyClients, shareCompCard } from "@/api/functions";
import { toast } from "@/components/ui/use-toast";

interface CompCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talents: any[];
  agencyName: string;
}

const CompCardModal = ({
  open,
  onOpenChange,
  talents,
  agencyName,
}: CompCardModalProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [selectedTalentIds, setSelectedTalentIds] = useState<string[]>([]);
  const [selectedExportFormat, setSelectedExportFormat] = useState<
    "pdf" | "jpeg"
  >("jpeg");
  const [exporting, setExporting] = useState<null | "jpeg" | "pdf">(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [shareSubject, setShareSubject] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const previewNodeRef = useRef<HTMLDivElement | null>(null);

  const selectedCount = selectedTalentIds.length;

  const toggleTalent = (id: string) => {
    setSelectedTalentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    if (selectedTalentIds.length === talents.length) {
      setSelectedTalentIds([]);
    } else {
      setSelectedTalentIds(talents.map((t) => t.id));
    }
  };

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const arr = Array.isArray(clients) ? clients : [];
    if (!q) return arr;
    return arr.filter((c: any) => {
      const name = String(
        c?.name || c?.client_name || c?.contact_name || "",
      ).toLowerCase();
      const email = String(
        c?.email || c?.client_email || c?.contact_email || "",
      ).toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [clients, clientSearch]);

  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const renderPreviewToPdfBlob = async () => {
    const dataUrl = await renderPreviewToJpeg(3);

    const img = new Image();
    const imgLoaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load exported image"));
    });
    img.src = dataUrl;
    await imgLoaded;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const margin = 36;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;

    const imgW = img.width;
    const imgH = img.height;
    const scale = Math.min(maxW / imgW, maxH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;

    doc.addImage(dataUrl, "JPEG", x, y, drawW, drawH, undefined, "FAST");
    const blob = doc.output("blob");
    return blob;
  };

  const uploadCompCardPublic = async (format: "jpeg" | "pdf") => {
    if (!previewTalentComputed) throw new Error("Missing selected talent");
    if (!supabase) throw new Error("Supabase not configured");

    let user = null as any;
    {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Not signed in",
          description:
            "Please sign in again, then retry sharing the comp card.",
          variant: "destructive",
        });
        throw new Error("Not authenticated");
      }

      // Best-effort refresh: can resolve stale sessions in long-running dev sessions.
      try {
        await supabase.auth.refreshSession();
      } catch {
        // ignore; we'll handle failures below
      }

      const {
        data: { user: u },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !u) {
        const msg = String((userErr as any)?.message || "");
        if (
          msg.includes("session_not_found") ||
          (userErr as any)?.status === 403
        ) {
          await supabase.auth.signOut();
          toast({
            title: "Session expired",
            description:
              "Please sign in again, then retry sharing the comp card.",
            variant: "destructive",
          });
          throw new Error("Session expired");
        }
        throw new Error("Not authenticated");
      }
      user = u;
    }

    const blob =
      format === "pdf"
        ? await renderPreviewToPdfBlob()
        : await dataUrlToBlob(await renderPreviewToJpeg(2));
    const id =
      (globalThis as any)?.crypto?.randomUUID?.() ||
      `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const talentId = String((previewTalentComputed as any)?.id || "unknown");
    const ext = format === "pdf" ? "pdf" : "jpg";
    const contentType = format === "pdf" ? "application/pdf" : "image/jpeg";
    const path = `agency/${user.id}/comp_cards/${talentId}/${id}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("likelee-public")
      .upload(path, blob, { upsert: true, contentType });
    if (uploadErr) throw uploadErr;
    const { data } = supabase.storage.from("likelee-public").getPublicUrl(path);
    const url = data?.publicUrl || "";
    if (!url) throw new Error("Failed to create public comp card URL");
    return url;
  };

  const onShareSend = async () => {
    if (!previewTalentComputed || selectedCount < 1) return;
    if (selectedClientIds.length < 1) return;
    setSharing(true);
    try {
      const compCardUrl = await uploadCompCardPublic(selectedExportFormat);
      const talentName =
        String((previewTalentComputed as any)?.name || "").trim() || undefined;
      const resp: any = await shareCompCard({
        client_ids: selectedClientIds,
        subject: shareSubject.trim() ? shareSubject.trim() : undefined,
        message: shareMessage.trim() ? shareMessage.trim() : undefined,
        comp_card_url: compCardUrl,
        talent_name: talentName,
      });
      setShareOpen(false);
      setSelectedClientIds([]);
      setShareSubject("");
      setShareMessage("");

      const sent = Number(resp?.sent ?? 0);
      const failed = Array.isArray(resp?.failed) ? resp.failed : [];
      if (failed.length > 0 && sent === 0) {
        const first = failed[0];
        const detail = first?.detail
          ? JSON.stringify(first.detail)
          : String(first?.error || "send_failed");
        toast({
          title: "Email not sent",
          description: detail,
          variant: "destructive",
        });
      } else if (failed.length > 0) {
        toast({
          title: "Partially sent",
          description: `${sent} sent, ${failed.length} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sent",
          description: "Comp card link sent to selected clients.",
        });
      }
    } catch (err: any) {
      const msg = String(err?.message || err || "Failed to share comp card");
      toast({
        title: "Share failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  };

  const clearSelected = () => {
    setSelectedTalentIds([]);
  };

  // For preview, use the first selected talent or the first in the list
  const previewTalent =
    talents.find((t) => selectedTalentIds.includes(t.id)) ||
    (talents.length > 0 ? talents[0] : null);

  useEffect(() => {
    if (!shareOpen) return;
    setClientsLoading(true);
    (async () => {
      try {
        const resp = await listAgencyClients();
        const arr = Array.isArray(resp) ? resp : (resp as any)?.data;
        setClients(Array.isArray(arr) ? arr : []);
      } finally {
        setClientsLoading(false);
      }
    })();
  }, [shareOpen]);

  useEffect(() => {
    if (!open) {
      setShareOpen(false);
      setSelectedClientIds([]);
      setShareSubject("");
      setShareMessage("");
      setClientSearch("");
    }
  }, [open]);

  const previewTalentComputed = useMemo(() => {
    if (!previewTalent) return null;

    const genderRaw = String((previewTalent as any)?.gender_identity || "")
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

    const ftRaw = Number((previewTalent as any)?.height_feet);
    const inchRaw = Number((previewTalent as any)?.height_inches);
    const hasFt = Number.isFinite(ftRaw) && ftRaw > 0;
    const hasIn = Number.isFinite(inchRaw) && inchRaw >= 0;
    const height =
      hasFt || hasIn
        ? `${hasFt ? ftRaw : 0}'${hasIn ? inchRaw : 0}"`
        : (previewTalent as any)?.height || null;

    const bustRaw = (previewTalent as any)?.bust_inches;
    const waistRaw = (previewTalent as any)?.waist_inches;
    const hipsRaw = (previewTalent as any)?.hips_inches;

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
          ? (previewTalent as any)?.measurements || null
          : null;

    return {
      ...previewTalent,
      _cc_height: height,
      _cc_bust: bust,
      _cc_waist: waist,
      _cc_hips: hips,
      _cc_measurements: measurements,
      _cc_is_male: isMale,
    } as any;
  }, [previewTalent]);

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const getExportBaseName = (t: any) => {
    const name = (t?.name || "CompCard").toString().trim();
    return name.replace(/\s+/g, "_");
  };

  const renderPreviewToJpeg = async (pixelRatio: number) => {
    const node = previewNodeRef.current;
    if (!node) throw new Error("Missing preview element");
    return await toJpeg(node, {
      quality: 0.95,
      cacheBust: true,
      backgroundColor: "#ffffff",
      pixelRatio,
    });
  };

  const dataUrlToBlob = async (dataUrl: string) => {
    const resp = await fetch(dataUrl);
    return await resp.blob();
  };

  const exportJpeg = async () => {
    if (!previewTalentComputed || selectedCount < 1) return;
    setExporting("jpeg");
    try {
      const dataUrl = await renderPreviewToJpeg(2);
      const base = getExportBaseName(previewTalentComputed);
      downloadDataUrl(dataUrl, `${base}_CompCard(1).jpg`);
    } finally {
      setExporting(null);
    }
  };

  const exportPdf = async () => {
    if (!previewTalentComputed || selectedCount < 1) return;
    setExporting("pdf");
    try {
      const blob = await renderPreviewToPdfBlob();
      const url = URL.createObjectURL(blob);
      const base = getExportBaseName(previewTalentComputed);
      downloadDataUrl(url, `${base}_CompCard(1).pdf`);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setExporting(null);
    }
  };

  const exportSelected = async () => {
    if (selectedExportFormat === "pdf") return exportPdf();
    return exportJpeg();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] lg:max-w-5xl h-[92vh] lg:h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-2">
          <DialogTitle className="text-2xl font-bold">
            Comp Card Generator
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Left Panel: Controls */}
          <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col p-4 sm:p-6 space-y-6 overflow-y-auto">
            {/* Template Selection */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-900">
                Choose Template
              </label>
              <div className="grid grid-cols-1 gap-3">
                <div
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedTemplate === "classic"
                      ? "border-purple-600 bg-purple-50"
                      : "border-gray-200 hover:border-purple-200"
                  }`}
                  onClick={() => setSelectedTemplate("classic")}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                      <Layout className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">
                        Classic Layout
                      </p>
                      <p className="text-xs text-gray-500">
                        Traditional comp card with 5 photos
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedTemplate === "modern"
                      ? "border-purple-600 bg-purple-50"
                      : "border-gray-200 hover:border-purple-200"
                  }`}
                  onClick={() => setSelectedTemplate("modern")}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                      <Layout className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">
                        Modern Layout
                      </p>
                      <p className="text-xs text-gray-500">
                        Clean, contemporary design
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedTemplate === "minimal"
                      ? "border-purple-600 bg-purple-50"
                      : "border-gray-200 hover:border-purple-200"
                  }`}
                  onClick={() => setSelectedTemplate("minimal")}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                      <Layout className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">
                        Minimal Layout
                      </p>
                      <p className="text-xs text-gray-500">
                        Simple, elegant style
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Talent Selection */}
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-900">
                  Select Talent
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    className="h-7 text-xs"
                  >
                    {selectedTalentIds.length === talents.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelected}
                    className="h-7 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-56 sm:h-64 rounded-xl border border-gray-200 p-2">
                <div className="space-y-1">
                  {talents.map((talent) => (
                    <div
                      key={talent.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                      onClick={() => toggleTalent(talent.id)}
                    >
                      <Checkbox
                        checked={selectedTalentIds.includes(talent.id)}
                        onCheckedChange={() => toggleTalent(talent.id)}
                      />
                      <img
                        src={talent.img || "https://placehold.co/150"}
                        alt={talent.name}
                        className="w-8 h-8 rounded-md object-cover"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {talent.name}
                      </span>
                    </div>
                  ))}
                  {talents.length === 0 && (
                    <p className="text-center text-sm text-gray-500 py-4">
                      No active talent found.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>

            {selectedCount > 0 ? (
              <div className="mt-auto space-y-3">
                <div className="border border-purple-200 bg-purple-50 text-purple-700 font-bold text-sm rounded-lg px-3 py-2">
                  {selectedCount} talent selected
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-bold text-gray-900">
                    Export format
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedExportFormat === "pdf"
                          ? "border-purple-600 bg-purple-50"
                          : "border-gray-200 hover:border-purple-200"
                      }`}
                      onClick={() => setSelectedExportFormat("pdf")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            PDF
                          </div>
                          <div className="text-xs text-gray-500">
                            Print-ready
                          </div>
                        </div>
                        {selectedExportFormat === "pdf" && (
                          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedExportFormat === "jpeg"
                          ? "border-purple-600 bg-purple-50"
                          : "border-gray-200 hover:border-purple-200"
                      }`}
                      onClick={() => setSelectedExportFormat("jpeg")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            JPEG
                          </div>
                          <div className="text-xs text-gray-500">Digital</div>
                        </div>
                        {selectedExportFormat === "jpeg" && (
                          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={exportSelected}
                  disabled={exporting !== null}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-purple-100"
                >
                  {selectedExportFormat === "pdf"
                    ? "Export 1 as PDF"
                    : "Export 1 as JPEG"}
                </Button>
                <div className="text-xs text-gray-500 leading-snug">
                  Export downloads to your computer (your browser may ask where
                  to save). Share will upload the selected format and email a
                  link to the client.
                </div>
                <Button
                  onClick={() => setShareOpen(true)}
                  disabled={exporting !== null}
                  variant="outline"
                  className="w-full font-bold h-12 rounded-xl"
                >
                  Share
                </Button>
              </div>
            ) : (
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 rounded-xl mt-auto shadow-lg shadow-purple-100">
                Generate Comp Cards
              </Button>
            )}
          </div>

          {/* Right Panel: Preview */}
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
                {/* === CLASSIC LAYOUT === */}
                {selectedTemplate === "classic" && (
                  <div className="grid grid-cols-2 h-full">
                    {/* Main Left Image */}
                    <div className="col-span-1 h-full relative border-r border-white/10">
                      <img
                        src={
                          previewTalentComputed.img ||
                          previewTalentComputed.profile_photo_url
                        }
                        className="w-full h-full object-cover"
                        alt={previewTalentComputed.name}
                        crossOrigin="anonymous"
                      />
                    </div>
                    {/* Right Grid of 4 (reusing active image since we lack a gallery for now) */}
                    <div className="col-span-1 grid grid-cols-2 grid-rows-2 h-full">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="relative border-b border-r border-white/10 overflow-hidden"
                        >
                          <img
                            src={
                              previewTalentComputed.img ||
                              previewTalentComputed.profile_photo_url
                            }
                            className="w-full h-full object-cover opacity-90"
                            alt=""
                            crossOrigin="anonymous"
                          />
                        </div>
                      ))}
                    </div>
                    {/* Footer Info */}
                    <div className="absolute bottom-0 w-full bg-white p-4 border-t border-gray-100 flex justify-between items-end">
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
                              Bust: {previewTalentComputed._cc_bust || "--"}
                            </span>
                          )}
                          {!previewTalentComputed._cc_is_male && (
                            <span>
                              Waist: {previewTalentComputed._cc_waist || "--"}
                            </span>
                          )}
                          {!previewTalentComputed._cc_is_male && (
                            <span>
                              Hips: {previewTalentComputed._cc_hips || "--"}
                            </span>
                          )}
                          <span>
                            Eyes: {previewTalentComputed.eye_color || "--"}
                          </span>
                          <span>
                            Hair: {previewTalentComputed.hair_color || "--"}
                          </span>
                        </div>
                        {(previewTalentComputed.email ||
                          previewTalentComputed.phone) && (
                          <div className="text-[9px] text-gray-400 mt-1 flex flex-col">
                            {previewTalentComputed.email && (
                              <span>{previewTalentComputed.email}</span>
                            )}
                            {previewTalentComputed.phone && (
                              <span>{previewTalentComputed.phone}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xs uppercase tracking-wider">
                          {agencyName}
                        </p>
                        <p className="text-[9px] text-gray-400">
                          bookings@
                          {agencyName.toLowerCase().replace(/\s+/g, "")}.com
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* === MODERN LAYOUT === */}
                {selectedTemplate === "modern" && (
                  <div className="w-full h-full relative">
                    <img
                      src={
                        previewTalentComputed.img ||
                        previewTalentComputed.profile_photo_url
                      }
                      className="w-full h-full object-cover"
                      alt={previewTalentComputed.name}
                      crossOrigin="anonymous"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
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
                      <div className="mt-4 text-[10px] opacity-80 flex flex-wrap gap-x-4 gap-y-1">
                        {previewTalentComputed.email && (
                          <span>{previewTalentComputed.email}</span>
                        )}
                        {previewTalentComputed.phone && (
                          <span>{previewTalentComputed.phone}</span>
                        )}
                      </div>
                      <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-end opacity-60">
                        <div>
                          <p className="font-bold text-sm tracking-widest uppercase">
                            {agencyName}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* === MINIMAL LAYOUT === */}
                {selectedTemplate === "minimal" && (
                  <div className="flex h-full">
                    <div className="w-2/3 h-full bg-gray-100">
                      <img
                        src={
                          previewTalentComputed.img ||
                          previewTalentComputed.profile_photo_url
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

                      <div className="mt-5 text-[10px] text-gray-500 space-y-1 break-words">
                        {previewTalentComputed.email && (
                          <p className="break-all">
                            {previewTalentComputed.email}
                          </p>
                        )}
                        {previewTalentComputed.phone && (
                          <p className="break-all">
                            {previewTalentComputed.phone}
                          </p>
                        )}
                      </div>

                      <div className="mt-auto pt-6 border-t border-gray-100 min-w-0">
                        <p className="font-bold text-xs text-gray-900 tracking-wider uppercase">
                          {agencyName}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-2 break-all">
                          bookings@
                          {agencyName.toLowerCase().replace(/\s+/g, "")}.com
                        </p>
                        <p className="text-[10px] text-gray-400">
                          (212) 555-0123
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <p>Select a talent to preview</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      <ShareCompCardDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        clientsLoading={clientsLoading}
        clients={clients}
        clientSearch={clientSearch}
        setClientSearch={setClientSearch}
        selectedClientIds={selectedClientIds}
        toggleClient={toggleClient}
        shareSubject={shareSubject}
        setShareSubject={setShareSubject}
        shareMessage={shareMessage}
        setShareMessage={setShareMessage}
        onSend={onShareSend}
        canSend={selectedClientIds.length > 0 && !sharing}
        sending={sharing}
      />
    </Dialog>
  );
};

const ShareCompCardDialog = ({
  open,
  onOpenChange,
  clientsLoading,
  clients,
  clientSearch,
  setClientSearch,
  selectedClientIds,
  toggleClient,
  shareSubject,
  setShareSubject,
  shareMessage,
  setShareMessage,
  onSend,
  canSend,
  sending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientsLoading: boolean;
  clients: any[];
  clientSearch: string;
  setClientSearch: (v: string) => void;
  selectedClientIds: string[];
  toggleClient: (id: string) => void;
  shareSubject: string;
  setShareSubject: (v: string) => void;
  shareMessage: string;
  setShareMessage: (v: string) => void;
  onSend: () => void;
  canSend: boolean;
  sending: boolean;
}) => {
  const filtered = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const arr = Array.isArray(clients) ? clients : [];
    if (!q) return arr;
    return arr.filter((c: any) => {
      const name = String(c?.contact_name || c?.company || "").toLowerCase();
      const email = String(c?.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [clients, clientSearch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Share Comp Card
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-900">
              Select clients
            </label>
            <Input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search by name or email"
            />
            <div className="rounded-xl border border-gray-200">
              <ScrollArea className="h-56 p-2">
                <div className="space-y-1">
                  {clientsLoading ? (
                    <div className="p-3 text-sm text-gray-500">
                      Loading clients...
                    </div>
                  ) : filtered.length > 0 ? (
                    filtered.map((c: any) => {
                      const id = String(c?.id || "");
                      const name = String(
                        c?.contact_name || c?.company || "Client",
                      );
                      const email = String(c?.email || "");
                      if (!id) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                          onClick={() => toggleClient(id)}
                        >
                          <Checkbox
                            checked={selectedClientIds.includes(id)}
                            onCheckedChange={() => toggleClient(id)}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-gray-900 truncate">
                              {name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {email || "—"}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 text-sm text-gray-500">
                      No clients found.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-900">
              Subject (optional)
            </label>
            <Input
              value={shareSubject}
              onChange={(e) => setShareSubject(e.target.value)}
              placeholder="Comp Card from Likelee"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-900">Message</label>
            <Textarea
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              placeholder='Write a custom message e.g. "I have a talent suitable for the job..."'
              className="min-h-[120px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              onClick={onSend}
              disabled={!canSend || sending}
              className="font-bold"
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompCardModal;
