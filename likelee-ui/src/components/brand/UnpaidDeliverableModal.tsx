import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Lock, AlertCircle, Loader2, Shield } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

interface UnpaidDeliverableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
}

export function UnpaidDeliverableModal({
  open,
  onOpenChange,
  offerId,
}: UnpaidDeliverableModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePayNow = async () => {
    if (!offerId) return;
    setLoading(true);
    try {
      const data: any = await base44.post(
        `/api/brand/campaign-offers/${encodeURIComponent(offerId)}/checkout`,
        {},
      );
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Payment Error",
          description: data?.message || "Could not start checkout session.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      const msg = String(e?.message || "");
      toast({
        title: msg.includes("no_talents_assigned")
          ? "Talent assignment required"
          : "Payment Error",
        description: msg.includes("no_talents_assigned")
          ? "The agency must assign at least 1 talent to this offer before you can pay. Please contact the agency and try again."
          : msg || "Could not start checkout.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <div className="relative">
          {/* Header/Banner */}
          <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-slate-800 p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-4 ring-4 ring-white/5">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Payment Required
            </h2>
            <p className="text-slate-400 mt-2 text-sm max-w-xs mx-auto">
              Secure your deliverables by completing the offer payment.
            </p>
          </div>

          <div className="p-8">
            <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100 mb-6">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-900">
                  Approval & Downloads Locked
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  You cannot approve or download content for this offer until
                  the payment is received. Once paid, all assets will be
                  instantly unlocked for your review and use.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handlePayNow}
                disabled={loading}
                className="w-full h-12 bg-black hover:bg-gray-800 text-white rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/10"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Complete Payment Now
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="w-full h-12 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl font-medium"
              >
                Maybe later
              </Button>
            </div>

            <p className="text-center text-[10px] text-gray-400 mt-6 tracking-wide uppercase font-semibold">
              <Shield className="w-3 h-3 inline-block mr-1 -mt-0.5" />
              Secure Payment via Stripe
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
