import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, X } from "lucide-react";
import {
  createCreatorSubscriptionCheckout,
  getCreatorBillingStatus,
} from "@/api/functions";
import { useToast } from "@/components/ui/use-toast";

export default function CreatorSubscribe() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";
  const [currentPlanTier, setCurrentPlanTier] = React.useState<string>("free");
  const [checkingOut, setCheckingOut] = React.useState(false);

  const canSelectBasic = !checkingOut && currentPlanTier !== "basic";
  const canSelectPro = !checkingOut && currentPlanTier !== "pro";

  const basicGroups = [
    {
      title: "Dashboard & Profile",
      items: [
        "Dashboard overview",
        "My Likeness",
        "Identity verification (KYC)",
        "Creator visibility trust unlock",
      ],
    },
    {
      title: "Connections & Payouts",
      items: [
        "Agency connection",
        "Brand connection",
        "Payouts",
      ],
    },
  ];

  const proGroups = [
    {
      title: "Everything in Basic, plus",
      items: [
        "Cameo video uploads",
        "Jobs",
        "Settings: My Rules",
      ],
    },
    {
      title: "Voice & Creator Tools",
      items: [
        "Voice profile creation",
        "Up to 6 voice tones",
        "Talent Portal",
      ],
    },
    {
      title: "Campaigns & Analytics",
      items: [
        "Campaign Archives",
        "Active Campaigns",
        "Advanced earnings analytics",
      ],
    },
  ];

  const comparisonSections = [
    {
      title: "Core access",
      rows: [
        ["Content", true, true],
        ["Dashboard", true, true],
        ["My Likeness", true, true],
        ["Identity verification (KYC)", true, true],
        ["Agency connection", true, true],
        ["Brand connection", true, true],
        ["Payouts", true, true],
      ],
    },
    {
      title: "Premium workflow",
      rows: [
        ["Cameo video uploads", false, true],
        ["Jobs", false, true],
        ["Settings: My Rules", false, true],
        ["Voice", false, true],
        ["Talent Portal", false, true],
        ["Campaign Archives", false, true],
        ["Active Campaigns", false, true],
        ["Advanced earnings analytics", false, true],
      ],
    },
  ] as const;

  React.useEffect(() => {
    async function loadStatus() {
      try {
        const resp = await getCreatorBillingStatus();
        setCurrentPlanTier(String((resp as any)?.plan_tier || "free"));
      } catch (error) {
        console.error("Failed to load creator billing status", error);
      }
    }
    void loadStatus();
  }, []);

  React.useEffect(() => {
    if (success) {
      navigate("/CreatorDashboard?section=settings&settings=billing", {
        replace: true,
      });
    }
  }, [navigate, success]);

  const onCheckout = async (plan: "basic" | "pro") => {
    setCheckingOut(true);
    try {
      const resp = await createCreatorSubscriptionCheckout({ plan });
      const url = String((resp as any)?.checkout_url || "");
      if (!url) {
        throw new Error("No checkout URL returned.");
      }
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: "Checkout failed",
        description: String(error?.message || error || "Please try again."),
        variant: "destructive",
      });
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F3EF] text-[#1B1C23]">
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-24">
        <div className="rounded-[36px] border border-[#D9E4F1] bg-[linear-gradient(180deg,#F3F8FF_0%,#F8FBFF_100%)] px-8 py-14 text-center shadow-[0_18px_60px_rgba(15,34,71,0.08)]">
          <Badge className="rounded-full border border-[#9EE4E6] bg-[#E9FBFB] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[#0B9DA2] shadow-none">
            Creator Plans
          </Badge>
          <h1 className="mt-6 text-5xl font-black tracking-tight text-[#17315F]">
            Own your likeness.
            <span className="mt-2 block font-serif italic font-medium text-[#0FA8AE]">
              Earn from it forever.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#56708F]">
            Simple, affordable plans so creators can protect, license, and
            monetize their identity in the AI era with the right level of
            access.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <Badge variant="outline" className="bg-white/80">
              Plans are billed monthly
            </Badge>
            {success && (
              <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-700">
                Subscription started
              </Badge>
            )}
            {canceled && (
              <Badge variant="outline" className="bg-white/80">
                Checkout canceled
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card
            role="button"
            tabIndex={0}
            aria-disabled={!canSelectBasic}
            onClick={() => {
              if (!canSelectBasic) return;
              void onCheckout("basic");
            }}
            onKeyDown={(e) => {
              if (!canSelectBasic) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void onCheckout("basic");
              }
            }}
            className={`rounded-[28px] rounded-tr-none rounded-br-none border border-[#D8E1EC]/60 bg-white p-6 lg:p-8 shadow-[0_14px_40px_rgba(20,37,66,0.06)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15A9AD]/40 focus-visible:ring-offset-2 lg:translate-y-3 ${
              canSelectBasic
                ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(20,37,66,0.08)]"
                : "cursor-default"
            }`}
          >
            <div className="flex items-start justify-between gap-6">
              <div className="max-w-sm">
                <Badge className="bg-[#DFF7F8] text-[#128C96] shadow-none hover:bg-[#DFF7F8]">
                  ESSENTIAL
                </Badge>
                <div className="mt-5 text-4xl font-black text-[#17315F]">
                  Basic
                </div>
                <div className="mt-3 text-[17px] leading-7 text-[#6D7F97]">
                  Get verified, build your likeness profile, and start earning
                  from licensing deals.
                </div>
              </div>
              <div className="min-w-[98px] pt-3 text-left">
                <div className="text-[20px] leading-none text-[#526A8A]">$</div>
                <div className="-mt-1 text-[58px] font-black leading-none tracking-[-0.06em] text-[#17315F]">
                  25
                </div>
                <div className="mt-1 text-[15px] leading-6 text-[#A9B6C8]">
                  per month
                </div>
              </div>
            </div>
            <div className="mt-8">
              <Button
                className="w-full rounded-l-2xl rounded-r-none bg-[#15A9AD] text-white font-black hover:bg-[#0F9699]"
                variant={currentPlanTier === "basic" ? "outline" : "default"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!canSelectBasic) return;
                  void onCheckout("basic");
                }}
                disabled={!canSelectBasic}
              >
                {currentPlanTier === "basic" ? "Current Plan" : "Basic Plan"}
              </Button>
            </div>
            <div className="mt-8 space-y-7">
              {basicGroups.map((group) => (
                <div key={group.title}>
                  <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#9AA9BC]">
                    {group.title}
                  </div>
                  <div className="pt-4">
                    <div className="mx-auto mb-4 h-px w-[90%] bg-[#E9EEF5]" />
                    <div className="space-y-3">
                    {group.items.map((label) => (
                      <div key={label} className="flex items-start gap-3 text-[#26415F]">
                        <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E8FAFB] text-[#12A4A9]">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-[15px] leading-6">{label}</div>
                      </div>
                    ))}
                    </div>
                  </div>
                </div>
              ))}
              <div>
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#C0C8D4]">
                  Not included
                </div>
                <div className="pt-4 text-[#B1B8C4]">
                  <div className="mx-auto mb-4 h-px w-[90%] bg-[#E9EEF5]" />
                  <div className="space-y-3">
                    {[
                      "Voice tools",
                      "Talent Portal",
                      "Advanced earnings analytics",
                    ].map((label) => (
                      <div key={label} className="flex items-start gap-3">
                        <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F5F7FA]">
                          <X className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-[15px] leading-6">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 rounded-[24px] border border-[#ACEBF0] bg-[#ECFBFD] p-5 text-[15px] leading-7 text-[#215C70]">
              Basic is the trust unlock. Without Basic and approved KYC, a
              creator cannot be visible in the marketplace or be managed by
              agencies and brands.
            </div>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            aria-disabled={!canSelectPro}
            onClick={() => {
              if (!canSelectPro) return;
              void onCheckout("pro");
            }}
            onKeyDown={(e) => {
              if (!canSelectPro) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void onCheckout("pro");
              }
            }}
            className={`rounded-[28px] rounded-tl-none rounded-bl-none border border-[#D8E1EC]/60 bg-[linear-gradient(180deg,#173664_0%,#122C55_58%,#10264A_100%)] p-6 lg:p-8 text-white shadow-[0_14px_40px_rgba(20,37,66,0.06)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1225] lg:-translate-y-3 ${
              canSelectPro
                ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(20,37,66,0.12)]"
                : "cursor-default"
            }`}
          >
            <div className="flex items-start justify-between gap-6">
              <div className="max-w-sm">
                <Badge className="bg-[#1C5375] text-[#89F4F7] shadow-none hover:bg-[#1C5375]">
                  MOST POPULAR
                </Badge>
                <div className="mt-5 flex items-center gap-3">
                  <div className="text-4xl font-black">Pro</div>
                  <Badge className="border border-white/10 bg-[#2E4DA4] text-white shadow-none">
                    Recommended
                  </Badge>
                </div>
                <div className="mt-3 text-[17px] leading-7 text-[#B8CAE3]">
                  The full creator suite — voice licensing, detection, IRL
                  bookings, and advanced analytics.
                </div>
              </div>
              <div className="min-w-[98px] pt-3 text-left">
                <div className="text-[20px] leading-none text-[#B7C8DD]">$</div>
                <div className="-mt-1 text-[58px] font-black leading-none tracking-[-0.06em] text-white">
                  50
                </div>
                <div className="mt-1 text-[15px] leading-6 text-[#9EB2CA]">
                  per month
                </div>
              </div>
            </div>
            <div className="mt-8">
              <Button
                className="w-full rounded-r-2xl rounded-l-none bg-white text-[#17315F] font-black hover:bg-white/95"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!canSelectPro) return;
                  void onCheckout("pro");
                }}
                disabled={!canSelectPro}
              >
                {currentPlanTier === "pro" ? "Current Plan" : "Pro Plan"}
              </Button>
            </div>
            <div className="mt-8 space-y-7">
              {proGroups.map((group) => (
                <div key={group.title}>
                  <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">
                    {group.title}
                  </div>
                  <div className="pt-4">
                    <div className="mx-auto mb-4 h-px w-[90%] bg-white/10" />
                    <div className="space-y-3">
                    {group.items.map((label) => (
                      <div key={label} className="flex items-start gap-3 text-white/90">
                        <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1E4D74] text-[#83F5F8]">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-[15px] leading-6">{label}</div>
                      </div>
                    ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-14 rounded-[32px] border border-[#DDE6F0] bg-white px-6 py-8 shadow-[0_18px_50px_rgba(20,37,66,0.06)] lg:px-10">
          <div>
            <div className="text-3xl font-black text-[#17315F]">
              Full comparison
            </div>
            <div className="mt-2 text-[#7A8CA4]">
              Every feature, side by side.
            </div>
          </div>
          <div className="mt-8 overflow-hidden rounded-[24px] border border-[#E3EAF2]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#F6FAFD] text-[#17315F]">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.24em] text-[#89A0B9]">
                    Feature
                  </th>
                  <th className="px-6 py-4 text-sm font-bold">Basic — $25/mo</th>
                  <th className="bg-[#173562] px-6 py-4 text-sm font-bold text-white">
                    Pro — $50/mo
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonSections.map((section) => (
                  <React.Fragment key={section.title}>
                    <tr className="border-t border-[#E8EEF5] bg-white">
                      <td
                        colSpan={3}
                        className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.24em] text-[#10A4AA]"
                      >
                        {section.title}
                      </td>
                    </tr>
                    {section.rows.map(([label, basic, pro]) => (
                      <tr
                        key={label}
                        className="border-t border-[#EEF3F8] text-[#47617D]"
                      >
                        <td className="px-6 py-4 text-[15px]">{label}</td>
                        <td className="px-6 py-4 bg-[#F9FBFD]">
                          <div className="flex justify-center">
                            {basic ? (
                              <Check className="h-4 w-4 text-[#12A4A9]" />
                            ) : (
                              <X className="h-4 w-4 text-[#9DB0C2]" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 bg-[#EEF4FB]">
                          <div className="flex justify-center">
                            {pro ? (
                              <Check className="h-4 w-4 text-[#12A4A9]" />
                            ) : (
                              <X className="h-4 w-4 text-[#9DB0C2]" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 flex justify-center">
          <Button variant="outline" onClick={() => navigate("/CreatorDashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
