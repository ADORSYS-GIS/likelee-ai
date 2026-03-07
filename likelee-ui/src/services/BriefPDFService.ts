import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function generateBriefPDF(brief: any, brandName: string, campaignName: string) {
    const doc = await PDFDocument.create();
    let page = doc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const cText = rgb(0.12, 0.12, 0.12);
    const cMuted = rgb(0.45, 0.45, 0.45);
    const cAccent = rgb(0.2, 0.4, 0.8);

    const margin = 50;
    let currentY = height - margin;

    const checkPageBreak = (neededH: number) => {
        if (currentY - neededH < margin) {
            page = doc.addPage([595.28, 841.89]);
            currentY = height - margin;
            return true;
        }
        return false;
    };

    const wrapText = (text: string, maxWidth: number, f: any, fontSize: number) => {
        const words = text.split(/\s+/);
        const lines = [];
        let currentLine = words[0] || "";

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine + " " + word;
            const width = f.widthOfTextAtSize(testLine, fontSize);
            if (width < maxWidth) {
                currentLine = testLine;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    };

    const drawWrappedText = (text: string, x: number, size: number, f = font, color = cText, indent = 0) => {
        const maxWidth = width - margin * 2 - indent;
        const lines = wrapText(text, maxWidth, f, size);
        for (const line of lines) {
            checkPageBreak(size + 6);
            page.drawText(line, { x: x + indent, y: currentY, size, font: f, color });
            currentY -= (size + 6);
        }
    };

    const drawHeading = (text: string, size = 10) => {
        checkPageBreak(size + 20);
        currentY -= 10;
        page.drawText(text.toUpperCase(), {
            x: margin,
            y: currentY,
            size,
            font: fontBold,
            color: cAccent
        });
        currentY -= (size + 10);
    };

    const drawImage = async (url: string) => {
        try {
            const resp = await fetch(url);
            const buf = await resp.arrayBuffer();
            let img;
            const urlLower = url.toLowerCase();
            if (urlLower.includes('.png')) {
                img = await doc.embedPng(buf);
            } else if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
                img = await doc.embedJpg(buf);
            } else {
                // Default to JPG but try-catch it
                try { img = await doc.embedJpg(buf); }
                catch { img = await doc.embedPng(buf); }
            }

            const dims = img.scale(1);
            const maxWidth = width - margin * 2;
            const maxHeight = 300;
            const scale = Math.min(maxWidth / dims.width, maxHeight / dims.height, 1);
            const finalW = dims.width * scale;
            const finalH = dims.height * scale;

            checkPageBreak(finalH + 20);
            page.drawImage(img, {
                x: margin,
                y: currentY - finalH,
                width: finalW,
                height: finalH
            });
            currentY -= (finalH + 30);
        } catch (e) {
            console.error("Failed to embed image", e);
            drawWrappedText(`[Image could not be loaded: ${url}]`, margin, 9, font, cMuted);
        }
    };

    // --- Start Rendering ---

    // Main Header
    page.drawRectangle({
        x: 0,
        y: height - 100,
        width: width,
        height: 100,
        color: rgb(0.96, 0.97, 0.98)
    });

    currentY = height - 40;
    page.drawText("CAMPAIGN BRIEF", { x: margin, y: currentY, size: 24, font: fontBold, color: cText });
    currentY -= 30;
    page.drawText(`${campaignName} | ${brandName}`, { x: margin, y: currentY, size: 12, font: font, color: cMuted });
    currentY = height - 120;

    const renderSection = async (title: string, fields: { label?: string; key: string; isList?: boolean }[]) => {
        let hasContent = false;
        for (const f of fields) {
            if (brief[f.key]) hasContent = true;
        }
        if (!hasContent) return;

        drawHeading(title);

        for (const f of fields) {
            const val = brief[f.key];
            if (!val) continue;

            if (f.label) {
                drawWrappedText(`${f.label}:`, margin, 10, fontBold, cText);
                currentY += 4; // Tighten slightly
            }

            if (f.isList) {
                const items = String(val).split('\n').map(s => s.trim().replace(/^[•-]\s*/, "")).filter(Boolean);
                for (const item of items) {
                    drawWrappedText(`• ${item}`, margin, 11, font, cText, 10);
                }
            } else {
                const lines = String(val).split('\n').filter(Boolean);
                for (const line of lines) {
                    drawWrappedText(line, margin, 11, font, cText, f.label ? 0 : 0);
                }
            }
            currentY -= 10;
        }
    };

    // Sections
    await renderSection("Voice & Tone", [
        { label: "Voice", key: "voice" },
        { label: "Tone", key: "tone" },
        { label: "Personality", key: "personality" }
    ]);

    await renderSection("Key Messages", [
        { key: "key_messages", isList: true }
    ]);

    await renderSection("Script Guidelines", [
        { label: "Opening (0-5s)", key: "script_opening" },
        { label: "Middle (5-20s)", key: "script_middle" },
        { label: "Closing (20-30s)", key: "script_closing" }
    ]);

    await renderSection("Guidelines", [
        { label: "Do's", key: "dos", isList: true },
        { label: "Don'ts", key: "donts", isList: true }
    ]);

    await renderSection("Visual Style", [
        { label: "Color Palette", key: "visual_color_palette" },
        { label: "Setting", key: "visual_setting" },
        { label: "Framing", key: "visual_framing" },
        { label: "Editing", key: "visual_editing" }
    ]);

    await renderSection("Deliverables", [
        { label: "Instagram Reels", key: "deliverables_reels" },
        { label: "Hero Image", key: "deliverables_hero_image" }
    ]);

    await renderSection("Scope & Objectives", [
        { label: "Objective", key: "overview_objective" },
        { label: "Target Audience", key: "overview_target_audience" },
        { label: "Campaign Duration", key: "overview_campaign_duration" },
        { label: "Launch Date", key: "overview_launch_date" }
    ]);

    await renderSection("Budget & Terms", [
        { label: "Total Budget", key: "budget_total" },
        { label: "Creator Payment", key: "budget_creator_payment" },
        { label: "Platform Fee", key: "budget_platform_fee" },
        { label: "Submission Deadline", key: "budget_submission_deadline" },
        { label: "Renewal Terms", key: "budget_renewal_terms" }
    ]);

    await renderSection("Revisions", [
        { label: "Included Revisions", key: "revision_included" },
        { label: "Major Changes", key: "revision_major_changes" },
        { label: "Turnaround", key: "revision_turnaround" }
    ]);

    await renderSection("Approval & Legal", [
        { label: "Approval Process", key: "approval_process", isList: true },
        { label: "Watermark & Protection", key: "watermark_protection" },
        { label: "Legal Terms", key: "legal_terms", isList: true }
    ]);

    // Brand Assets
    const brandAssets = Array.isArray(brief?.brand_assets) ? brief.brand_assets : [];
    if (brandAssets.length > 0) {
        drawHeading("Brand Assets (Files provided)");
        for (const asset of brandAssets) {
            if (asset?.name) {
                drawWrappedText(`• ${asset.name}`, margin, 11, font, cText, 10);
            }
        }
        currentY -= 20;
    }

    // Reference Images
    const refImages = Array.isArray(brief?.reference_images) ? brief.reference_images : [];
    if (refImages.length > 0) {
        drawHeading("Reference Images");
        for (const img of refImages) {
            if (img?.url) {
                await drawImage(img.url);
            }
        }
    }

    // Footer / Pagination could be added here

    const pdfBytes = await doc.save();
    const blob = new Blob([pdfBytes.buffer as any], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Brief_${campaignName.replace(/\s+/g, "_")}.pdf`;
    link.click();
}
