import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listTransactions, type StudioTransaction } from "@/api/studio";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatAmount(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}`;
}

function reasonLabel(reason: string): string {
  return reason
    .split("_")
    .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1))
    .join(" ");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function WalletTransactionsDialog({
  open,
  onOpenChange,
}: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["studio", "transactions"],
    queryFn: () => listTransactions(),
    enabled: open,
  });

  const rows: StudioTransaction[] = Array.isArray(data) ? data : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" hideClose={false}>
        <DialogHeader>
          <DialogTitle>Wallet Transactions</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}

        {!isLoading && error && (
          <div className="text-sm text-red-500">
            Failed to load transactions.
          </div>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No transactions yet.
          </div>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-4 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        t.delta >= 0
                          ? "bg-green-500/20 text-green-600 border-green-500/30"
                          : "bg-red-500/20 text-red-600 border-red-500/30",
                      )}
                    >
                      {formatAmount(t.delta)}
                    </Badge>
                    <span className="text-sm font-medium">
                      {reasonLabel(t.reason)}
                    </span>
                    {t.provider && (
                      <Badge className="bg-gray-100 text-gray-700">
                        {t.provider}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    {formatDate(t.created_at)}
                    {t.generation_id ? ` • Generation: ${t.generation_id}` : ""}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-semibold">{t.balance_after}</div>
                  <div className="text-xs text-muted-foreground">
                    balance after
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
