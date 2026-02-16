import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: (import("clsx").ClassValue | undefined)[]) {
  // @ts-ignore
  return twMerge(clsx(inputs));
}

export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
