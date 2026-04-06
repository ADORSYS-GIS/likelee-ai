export function createPageUrl(pageName: string): string {
  return "/" + pageName.toLowerCase().replace(/ /g, "-");
}

export { getUserFriendlyError } from "./error-utils";
export function clampAndSnapCommissionPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.max(0, Math.min(100, value));
  return Math.round(clamped / 5) * 5;
}
