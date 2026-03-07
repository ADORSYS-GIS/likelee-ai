import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function generateBriefPDF(brief: any, brandName: string, campaignName: string) {
    const doc = await PDFDocument.create();
    let page = doc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const cText = rgb(0.12, 0.12, 0.12);
    const cMuted = rgb(0.45, 0.45, 0.45);
    const cBorder = rgb(0.9, 0.92, 0.95);

    const margin = 50;
    let currentY = height - margin;

    const drawText = (text: string, x: number, y: number, size: number, f = font, color = cText) => {
        page.drawText(text, { x, y, size, font: f, color });
    };

    const checkPageBreak = (neededH: number) => {
        if (currentY - neededH < margin) {
            page = doc.addPage([595.28, 841.89]);
            currentY = height - margin;
        }
    };

    // Header
    drawText("CAMPAIGN BRIEF", margin, currentY, 20, fontBold);
    currentY -= 30;
    drawText(`Campaign: ${campaignName}`, margin, currentY, 14, fontBold);
    currentY -= 20;
    drawText(`Brand: ${brandName}`, margin, currentY, 12, font);
    currentY -= 40;

    const sections = [
        { title: "Voice & Tone", fields: ["voice", "tone", "personality"] },
        { title: "Key Messages", field: "key_messages" },
        { title: "Script Guidelines", fields: ["script_opening", "script_middle", "script_closing"] },
        { title: "Do's", field: "dos" },
        { title: "Don'ts", field: "donts" },
        { title: "Visual Style", fields: ["visual_color_palette", "visual_setting", "visual_framing", "visual_editing"] },
        { title: "Deliverables", fields: ["deliverables_reels", "deliverables_hero_image"] },
        { title: "Scope & Objectives", fields: ["overview_objective", "overview_target_audience", "overview_campaign_duration", "overview_launch_date"] },
    ];

    for (const section of sections) {
        checkPageBreak(50);
        drawText(section.title.toUpperCase(), margin, currentY, 10, fontBold, cMuted);
        currentY -= 15;

        if (section.field) {
            const val = String(brief[section.field] || "Not specified");
            const lines = val.split("\n");
            for (const line of lines) {
                checkPageBreak(15);
                drawText(line, margin + 10, currentY, 11);
                currentY -= 15;
            }
        } else if (section.fields) {
            for (const f of section.fields) {
                const label = f.split("_").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
                const val = String(brief[f] || "Not specified");
                checkPageBreak(15);
                drawText(`${label}: ${val}`, margin + 10, currentY, 11);
                currentY -= 15;
            }
        }
        currentY -= 20;
    }

    const pdfBytes = await doc.save();
    const blob = new Blob([pdfBytes.buffer as any], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Brief_${campaignName.replace(/\s+/g, "_")}.pdf`;
    link.click();
}
