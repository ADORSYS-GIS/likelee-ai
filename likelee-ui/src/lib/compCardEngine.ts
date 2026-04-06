import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";

export type CompCardExportFormat = "jpeg" | "pdf";

const MAX_COMP_CARD_BYTES = 15 * 1024 * 1024;

const isCorsTaintError = (err: unknown) => {
  const msg = String((err as any)?.message || "").toLowerCase();
  const name = String((err as any)?.name || "").toLowerCase();
  return (
    name.includes("securityerror") ||
    msg.includes("tainted") ||
    msg.includes("cross-origin") ||
    msg.includes("cross origin")
  );
};

export type PublicUploadMeta = {
  name: string;
  size: number;
  url: string;
  path: string;
  mime_type: string;
};

export const renderNodeToJpegDataUrl = async (
  node: HTMLElement,
  pixelRatio: number,
) => {
  try {
    return await toJpeg(node, {
      quality: 0.95,
      cacheBust: true,
      backgroundColor: "#ffffff",
      pixelRatio,
      fontEmbedCSS: "",
      preferredFontFormat: undefined,
    });
  } catch (e) {
    if (isCorsTaintError(e)) {
      throw new Error(
        "Comp card export failed due to cross-origin images. Use images hosted on a CORS-enabled domain, or re-upload the images into Likelee storage and try again.",
      );
    }
    throw e;
  }
};

export const dataUrlToBlob = async (dataUrl: string) => {
  const resp = await fetch(dataUrl);
  return await resp.blob();
};

export const renderNodeToPdfBlob = async (node: HTMLElement) => {
  const dataUrl = await renderNodeToJpegDataUrl(node, 3);

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
  return doc.output("blob");
};

export const exportNodeToBlob = async (
  node: HTMLElement,
  format: CompCardExportFormat,
) => {
  if (format === "pdf") {
    return {
      blob: await renderNodeToPdfBlob(node),
      ext: "pdf",
      mime_type: "application/pdf",
    };
  }

  const dataUrl = await renderNodeToJpegDataUrl(node, 2);
  return {
    blob: await dataUrlToBlob(dataUrl),
    ext: "jpg",
    mime_type: "image/jpeg",
  };
};

export const uploadToLikeleePublic = async (args: {
  supabase: any;
  path: string;
  blob: Blob;
  contentType: string;
}) => {
  const { supabase, path, blob, contentType } = args;
  const { error: uploadErr } = await supabase.storage
    .from("likelee-public")
    .upload(path, blob, { upsert: true, contentType });
  if (uploadErr) throw uploadErr;
  const { data } = supabase.storage.from("likelee-public").getPublicUrl(path);
  const url = String(data?.publicUrl || "");
  if (!url) throw new Error("Failed to create public comp card URL");
  return { url };
};

export const generateAndUploadCompCard = async (args: {
  supabase: any;
  node: HTMLElement;
  format: CompCardExportFormat;
  userId: string;
  talentId: string;
  filenameBase: string;
  prefix?: string;
}) => {
  const { supabase, node, format, userId, talentId, filenameBase, prefix } =
    args;
  const safeBase =
    filenameBase.replace(/[\s/\\]+/g, "_").slice(0, 64) || "CompCard";

  const id =
    (globalThis as any)?.crypto?.randomUUID?.() ||
    `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const exported = await exportNodeToBlob(node, format);
  if (exported.blob.size > MAX_COMP_CARD_BYTES) {
    throw new Error(
      `Generated comp card is too large (${Math.ceil(exported.blob.size / (1024 * 1024))}MB). Please try JPEG export, reduce the number/size of images, or use lower-resolution images.`,
    );
  }
  const path = `${prefix || "agency"}/${userId}/comp_cards/${talentId}/${id}_${safeBase}.${exported.ext}`;

  await uploadToLikeleePublic({
    supabase,
    path,
    blob: exported.blob,
    contentType: exported.mime_type,
  });

  const { data } = supabase.storage.from("likelee-public").getPublicUrl(path);
  return {
    name: `${safeBase}.${exported.ext}`,
    size: exported.blob.size,
    url: String(data?.publicUrl || ""),
    path,
    mime_type: exported.mime_type,
  } satisfies PublicUploadMeta;
};
