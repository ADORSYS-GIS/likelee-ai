import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, ShieldCheck, CreditCard } from "lucide-react";
import { createPageUrl } from "@/utils";
import { createAgencySubscriptionCheckout } from "@/api/functions";

type Tier = {
  name: string;
  priceLabel: string;
  isFree?: boolean;
  highlight?: boolean;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaAction: "contact" | "back" | "pay_agency" | "pay_scale";
};

const tiers: Tier[] = [
  {
    name: "Free",
    priceLabel: "$0",
    isFree: true,
    description: "For evaluation, onboarding, and very small agencies.",
    features: [
      "5GB storage",
      "Email services included",
      "Docuseal signing included (3 templates)",
      "Shallow analytics",
      "KYC (Veriff): 1 verification included",
      "Voice cloning not included",
    ],
    ctaLabel: "Back to Dashboard",
    ctaAction: "back",
  },
  {
    name: "Agency",
    priceLabel: "$500",
    description: "Minimum paid plan for agencies using the platform operationally.",
    features: [
      "200GB storage",
      "Email services included",
      "Docuseal e-signing included",
      "Deep analytics (drilldowns + exports)",
      "6 voice clones included",
      "Veriff included: 50 verifications/month",
      "Veriff overage billed per verification",
      "Priority support + onboarding session",
    ],
    ctaLabel: "Upgrade to Agency",
    ctaAction: "pay_agency",
  },
  {
    name: "Scale",
    priceLabel: "$900",
    highlight: true,
    description: "For larger agencies with higher volume and reporting needs.",
    features: [
      "1TB storage",
      "Email services included",
      "Docuseal e-signing included",
      "Deep+ analytics (advanced + scheduled exports)",
      "20 voice clones included",
      "Veriff included: 150 verifications/month",
      "Veriff overage billed per verification",
      "Priority support",
    ],
    ctaLabel: "Upgrade to Scale",
    ctaAction: "pay_scale",
  },
  {
    name: "Enterprise",
    priceLabel: "Custom",
    description: "Custom storage, security, SLAs, onboarding, and integrations.",
    features: [
      "Custom storage + custom caps",
      "Security/compliance options",
      "SLA + dedicated onboarding",
      "Custom analytics + reporting",
      "Custom Veriff + voice usage",
    ],
    ctaLabel: "Contact Sales",
    ctaAction: "contact",
  },
];

export default function AgencySubscribe() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";

  React.useEffect(() => {
    if (!success) return;
    navigate(`${createPageUrl("AgencyDashboard")}?tab=settings&subTab=General%20Settings`, {
      replace: true,
    });
  }, [navigate, success]);

  const onContact = () => {
    navigate(createPageUrl("SalesInquiry"));
  };

  const onPayAgency = async () => {
    const resp = await createAgencySubscriptionCheckout({ tier: "agency" });
    const url = (resp as any)?.checkout_url as string | undefined;
    if (!url) {
      navigate(createPageUrl("SalesInquiry"));
      return;
    }
    window.location.href = url;
  };

  const onPayScale = async () => {
    const resp = await createAgencySubscriptionCheckout({ tier: "scale" });
    const url = (resp as any)?.checkout_url as string | undefined;
    if (!url) {
      navigate(createPageUrl("SalesInquiry"));
      return;
    }
    window.location.href = url;
  };

  const onBack = () => {
    navigate(createPageUrl("AgencyDashboard"));
  };

  return (
    <div
      style={{
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(50,200,209,0.16), rgba(10,10,15,0) 60%), radial-gradient(1000px 500px at 80% 20%, rgba(241,139,106,0.14), rgba(10,10,15,0) 60%), #0A0A0F",
        minHeight: "100vh",
        color: "#fff",
      }}
    >
      <header className="px-6 py-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">Billing & Subscription</div>
              <div className="text-xs text-gray-400">Choose a plan for your agency</div>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-gray-400 hover:text-white"
          >
            ← Back to Dashboard
          </Button>
        </div>
      </header>

      <section className="px-6 pt-12 pb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-5 flex-wrap">
          <Badge className="bg-white/10 text-white border-white/20">Plans are billed monthly</Badge>
          {success && (
            <Badge className="bg-[#32C8D1]/20 text-[#32C8D1] border-[#32C8D1]/35">
              Subscription started
            </Badge>
          )}
          {canceled && (
            <Badge className="bg-white/10 text-white border-white/20">Checkout canceled</Badge>
          )}
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-4">Upgrade Your Agency Plan</h1>
        <p className="text-lg text-gray-400 max-w-3xl mx-auto">
          Our minimum paid plan starts at $500/month per agency. Paid plans include operational
          capabilities like deep analytics, voice cloning, KYC with caps, and priority support.
        </p>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`p-7 backdrop-blur-sm border-2 rounded-xl transition-all relative overflow-hidden ${
                tier.highlight
                  ? "bg-white/10 border-[#32C8D1]/60 hover:border-[#32C8D1] shadow-2xl shadow-[#32C8D1]/15"
                  : tier.name === "Agency"
                    ? "bg-white/8 border-[#F18B6A]/50 hover:border-[#F18B6A] shadow-xl shadow-[#F18B6A]/10"
                    : "bg-white/5 border-white/10 hover:border-white/25"
              }`}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  tier.highlight
                    ? "bg-gradient-to-r from-[#32C8D1] via-teal-400 to-cyan-500"
                    : tier.name === "Agency"
                      ? "bg-gradient-to-r from-[#F18B6A] via-orange-400 to-amber-400"
                      : "bg-white/10"
                }`}
              />
              <div className="flex items-center justify-between mb-4">
                <div className="text-xl font-bold text-white">{tier.name}</div>
                {tier.highlight ? (
                  <Badge className="bg-[#32C8D1]/20 text-[#32C8D1] border-[#32C8D1]/35">
                    Recommended
                  </Badge>
                ) : tier.isFree ? (
                  <Badge className="bg-white/10 text-white border-white/20">Starter</Badge>
                ) : (
                  <Badge className="bg-white/10 text-white border-white/20">
                    {tier.name === "Agency" ? "Pro" : "Tier"}
                  </Badge>
                )}
              </div>

              <div className="flex items-baseline mb-2">
                <span className="text-4xl font-bold text-white">{tier.priceLabel}</span>
                {tier.priceLabel !== "Custom" && (
                  <span className="text-gray-400 ml-2">/ month</span>
                )}
              </div>
              <p className="text-gray-400 mb-6 text-sm">{tier.description}</p>

              <ul className="space-y-2 mb-7 text-sm text-gray-300">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={
                  tier.ctaAction === "contact"
                    ? onContact
                    : tier.ctaAction === "pay_agency"
                      ? onPayAgency
                    : tier.ctaAction === "pay_scale"
                      ? onPayScale
                      : onBack
                }
                disabled={tier.ctaAction === "pay_agency" || tier.ctaAction === "pay_scale"}
                className={`w-full h-11 font-bold ${
                  tier.highlight
                    ? "bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:opacity-95 shadow-xl shadow-[#32C8D1]/25"
                    : tier.name === "Agency"
                      ? "bg-gradient-to-r from-[#F18B6A] to-[#E07A5A] hover:opacity-95 shadow-xl shadow-[#F18B6A]/25"
                      : "bg-white/10 hover:bg-white/15 border border-white/10"
                }`}
                variant={tier.highlight ? "default" : "secondary"}
              >
                {tier.ctaLabel}
                {(tier.ctaAction === "contact" ||
                  tier.ctaAction === "pay_agency" ||
                  tier.ctaAction === "pay_scale") && (
                  <ArrowRight className="w-4 h-4 ml-2" />
                )}
              </Button>
            </Card>
          ))}
        </div>

        <div className="max-w-6xl mx-auto mt-10">
          <Card className="p-6 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#32C8D1] mt-0.5" />
              <div>
                <div className="text-white font-bold mb-1">Veriff included with caps</div>
                <div className="text-gray-400 text-sm">
                  Paid plans include Veriff identity verification with monthly caps per agency.
                  Overage is billed per verification.
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
