import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldHintProps = {
  children?: ReactNode;
  className?: string;
};

export function MandatoryHint({
  children = "Mandatory field",
  className,
}: FieldHintProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
        className,
      )}
    >
      {children}
    </span>
  );
}
