import { jsPDF } from "jspdf";

export async function downloadTermsPdf(containerId: string, title: string) {
  if (typeof window === "undefined") return;
  const container = document.getElementById(containerId);
  if (!container) return;

  const clone = container.cloneNode(true) as HTMLElement;
  clone.style.fontFamily = '"Helvetica Neue", Arial, sans-serif';
  clone.style.color = "#111827";
  clone.style.fontSize = "12px";
  clone.style.lineHeight = "1.4";

  const setMargins = (el: HTMLElement, margin: string) => {
    el.style.margin = margin;
  };

  clone.querySelectorAll("h2").forEach((el) => {
    const heading = el as HTMLElement;
    heading.style.fontSize = "16px";
    heading.style.fontWeight = "700";
    setMargins(heading, "0 0 8px");
  });
  clone.querySelectorAll("h3").forEach((el) => {
    const heading = el as HTMLElement;
    heading.style.fontSize = "14px";
    heading.style.fontWeight = "700";
    setMargins(heading, "12px 0 6px");
  });
  clone.querySelectorAll("h4").forEach((el) => {
    const heading = el as HTMLElement;
    heading.style.fontSize = "12px";
    heading.style.fontWeight = "700";
    setMargins(heading, "8px 0 4px");
  });
  clone.querySelectorAll("p").forEach((el) => {
    const paragraph = el as HTMLElement;
    paragraph.style.fontSize = "12px";
    paragraph.style.margin = "0 0 6px";
  });
  clone.querySelectorAll("ul").forEach((el) => {
    const list = el as HTMLElement;
    list.style.paddingLeft = "18px";
    list.style.margin = "0 0 6px";
  });
  clone.querySelectorAll("li").forEach((el) => {
    const item = el as HTMLElement;
    item.style.margin = "0 0 4px";
  });
  clone.querySelectorAll("strong").forEach((el) => {
    const strong = el as HTMLElement;
    strong.style.fontWeight = "700";
  });

  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  });

  await doc.html(clone, {
    x: 32,
    y: 48,
    width: 520,
    windowWidth: 1024,
    margin: [48, 32, 48, 32],
    autoPaging: "text",
  });

  doc.save(`${title.replace(/\\s+/g, "-").toLowerCase()}.pdf`);
}
