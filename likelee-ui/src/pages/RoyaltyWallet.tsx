import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Wallet as WalletIcon, CheckCircle2, Clock } from "lucide-react";

type Row = {
  face_id: string;
  face_name: string | null;
  period_month: string;
  paid_cents: number;
  pending_cents: number;
  total_cents: number;
  event_count: number;
};

export default function RoyaltyWallet({ faceName }: { faceName?: string }) {
  const { data, isLoading, error } = useQuery<Row[]>({
    queryKey: ["v_face_payouts"],
    queryFn: async () => {
      if (!supabase) return [];
      let query = supabase.from("v_face_payouts").select("*");
      if (faceName) {
        query = query.eq("face_name", faceName);
      }
      const { data, error } = await query.order("period_month", {
        ascending: false,
      });
      if (error) throw error;
      return data as Row[];
    },
  });

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const faceDisplay = faceName || (data && data[0]?.face_name) || "Your Wallet";
  const totals = (data || []).reduce(
    (acc, r) => {
      acc.paid += r.paid_cents || 0;
      acc.pending += r.pending_cents || 0;
      acc.total += r.total_cents || 0;
      return acc;
    },
    { paid: 0, pending: 0, total: 0 },
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="relative overflow-hidden rounded-2xl border-2 border-black bg-gradient-to-r from-[#F18B6A] to-pink-500">
        <div className="absolute -right-10 -top-10 opacity-20">
          <WalletIcon className="w-40 h-40 text-white" />
        </div>
        <div className="p-6 sm:p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <WalletIcon className="w-6 h-6" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Royalty Wallet
            </h1>
          </div>
          <p className="text-white/90 text-sm sm:text-base">
            Creator Wallet for {faceDisplay}
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/15 backdrop-blur-sm border border-white/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-white/80">
                  Paid
                </span>
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <div className="mt-2 text-2xl font-bold">
                {formatMoney(totals.paid)}
              </div>
            </div>
            <div className="rounded-xl bg-white/15 backdrop-blur-sm border border-white/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-white/80">
                  Pending
                </span>
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div className="mt-2 text-2xl font-bold">
                {formatMoney(totals.pending)}
              </div>
            </div>
            <div className="rounded-xl bg-white/15 backdrop-blur-sm border border-white/30 p-4">
              <div className="text-xs uppercase tracking-wide text-white/80">
                Lifetime Total
              </div>
              <div className="mt-2 text-2xl font-bold">
                {formatMoney(totals.total)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading && <div className="mt-6 text-gray-600">Loading wallet...</div>}
      {error && (
        <div className="mt-6 text-red-500">
          {(error as any)?.message || "Failed to load payouts"}
        </div>
      )}

      {!isLoading && !error && (
        <div className="mt-8 rounded-xl border-2 border-black overflow-hidden bg-white">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="font-semibold">Monthly Payouts</div>
            <div className="text-xs text-gray-500">Read-only</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
                  <th className="px-4 py-3 text-left">Creator</th>
                  <th className="px-4 py-3 text-left">Month</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Events</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data && data.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-gray-500" colSpan={6}>
                      No payout data yet
                    </td>
                  </tr>
                )}
                {data?.map((row) => (
                  <tr
                    key={`${row.face_id}-${row.period_month}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.face_name || row.face_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(row.period_month).toLocaleDateString(
                        undefined,
                        { year: "numeric", month: "short" },
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">
                      {formatMoney(row.paid_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700">
                      {formatMoney(row.pending_cents)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatMoney(row.total_cents)}
                    </td>
                    <td className="px-4 py-3 text-right">{row.event_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        Read-only MVP. Fixed-price bookings only. Status: pending or paid.
      </div>
    </div>
  );
}
