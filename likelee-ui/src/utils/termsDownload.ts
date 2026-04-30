import { jsPDF } from "jspdf";

type TermsPdfMode = "save" | "open";

export async function downloadTermsPdf(
  containerId: string,
  title: string,
  mode: TermsPdfMode = "save",
) {
  if (typeof window === "undefined") return;

  // Ensure fonts are actually loaded before cloning
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const container = document.getElementById(containerId);
  if (!container) return;

  const clone = container.cloneNode(true) as HTMLElement;

  // "Goldilocks" balanced styling for professional readability
  clone.style.fontFamily = '"Sora", "Helvetica", "Arial", sans-serif';
  clone.style.color = "#111827";
  clone.style.fontSize = "18px";
  clone.style.lineHeight = "1.25"; // Comfortable, professional spacing
  clone.style.textAlign = "left";
  clone.style.wordSpacing = "normal";
  clone.style.letterSpacing = "normal";
  clone.style.whiteSpace = "normal";
  clone.style.wordBreak = "normal";
  clone.style.padding = "40pt";
  clone.style.boxSizing = "border-box";
  clone.style.background = "#ffffff";
  clone.style.width = "1024px";

  const setStyle = (el: HTMLElement) => {
    el.style.textAlign = "left";
    el.style.wordSpacing = "normal";
    el.style.letterSpacing = "normal";
    el.style.lineHeight = "1.25";
  };

  clone.querySelectorAll("*").forEach((el) => {
    const element = el as HTMLElement;
    element.style.fontFamily = '"Sora", "Helvetica", "Arial", sans-serif';
    element.style.margin = "0";
    element.style.padding = "0";
    setStyle(element);
  });

  clone.querySelectorAll("h2").forEach((el) => {
    const heading = el as HTMLElement;
    heading.style.fontFamily = '"Fraunces", "Times New Roman", serif';
    heading.style.fontSize = "26px";
    heading.style.fontWeight = "700";
    // Proper spacing before and after section headings
    heading.style.margin = "0 0 14pt";
    setStyle(heading);
  });
  clone.querySelectorAll("h3").forEach((el) => {
    const heading = el as HTMLElement;
    heading.style.fontFamily = '"Fraunces", "Times New Roman", serif';
    heading.style.fontSize = "22px";
    heading.style.fontWeight = "700";
    heading.style.margin = "18pt 0 10pt";
    setStyle(heading);
  });
  clone.querySelectorAll("h4").forEach((el) => {
    const heading = el as HTMLElement;
    heading.style.fontFamily = '"Fraunces", "Times New Roman", serif';
    heading.style.fontSize = "18px";
    heading.style.fontWeight = "700";
    heading.style.margin = "14pt 0 8pt";
    setStyle(heading);
  });
  clone.querySelectorAll("p").forEach((el) => {
    const paragraph = el as HTMLElement;
    paragraph.style.fontSize = "18px";
    // Proper spacing between paragraphs
    paragraph.style.margin = "0 0 12pt";
    setStyle(paragraph);
  });

  // Manual list replacement with consistent spacing
  clone.querySelectorAll("ul").forEach((el) => {
    const list = el as HTMLElement;
    const replacement = document.createElement("div");
    replacement.style.margin = "10pt 0";
    replacement.style.padding = "0";
    replacement.style.display = "block";
    setStyle(replacement);

    list.querySelectorAll("li").forEach((li) => {
      const item = document.createElement("p");
      item.style.fontFamily = '"Sora", "Helvetica", "Arial", sans-serif';
      item.style.fontSize = "18px";
      item.style.margin = "0 0 8pt";
      setStyle(item);
      // Normalized word spacing
      item.textContent = `• ${li.textContent?.trim().replace(/\s+/g, " ") ?? ""}`;
      replacement.appendChild(item);
    });

    list.replaceWith(replacement);
  });

  clone.querySelectorAll("strong").forEach((el) => {
    const strong = el as HTMLElement;
    strong.style.fontWeight = "700";
    setStyle(strong);
  });

  // Whitespace and punctuation cleanup
  const textWalker = document.createTreeWalker(
    clone,
    NodeFilter.SHOW_TEXT,
    null,
  );
  let n: Node | null;
  while ((n = textWalker.nextNode())) {
    if (n.nodeValue) {
      n.nodeValue = n.nodeValue
        .replace(/\s+/g, " ")
        .replace(/\s+([,.;:!?\)])/g, "$1")
        .replace(/\(\s+/g, "(")
        .trim();
    }
  }

  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  });

  await doc.html(clone, {
    x: 0,
    y: 0,
    width: 560,
    windowWidth: 1024,
    autoPaging: "text",
    margin: [40, 40, 40, 40],
  });

  if (mode === "open") {
    const url = doc.output("bloburl");
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  doc.save(`${title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
