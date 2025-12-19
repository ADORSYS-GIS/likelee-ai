import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Shield,
  Users,
  DollarSign,
  CheckCircle2,
  TrendingUp,
  Clock,
  Eye,
  Award,
  AlertCircle,
  BarChart3,
  FileCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TalentAgency() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scrollToHowItWorks = () => {
    const el = document.getElementById("how-it-works");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Talent & Modeling Agency Solutions",
      description:
        "License your models' likenesses. Earn recurring revenue from the same photos and faces—year after year.",
      provider: {
        "@type": "Organization",
        name: "Likelee",
        url: "https://likelee.ai",
      },
      serviceType: "Talent Agency Licensing Platform",
      areaServed: "Worldwide",
      audience: {
        "@type": "Audience",
        audienceType: "Talent Agencies, Modeling Agencies",
      },
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative px-6 py-20 overflow-hidden bg-[#0D1B3A] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            {t("talentAgency.hero.title")}
          </h1>
          <p className="text-lg md:text-xl font-semibold mb-4">
            {t("talentAgency.hero.subtitle")}
          </p>
          <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8">
            {t("talentAgency.hero.description")}
          </p>
          <Button
            onClick={() => navigate(createPageUrl("SalesInquiry"))}
            className="h-12 px-10 text-lg font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all"
          >
            {t("talentAgency.hero.cta")}
          </Button>
        </div>
      </section>

      {/* Section 2: Two Ways Your Models Can Earn */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            {t("talentAgency.bookingsDropping.title")}
          </h2>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed">
            {t("talentAgency.bookingsDropping.description")}
          </p>
        </div>
      </section>

      {/* Section 4: Why Agencies Choose Likelee */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("talentAgency.twoWays.title")}
            </h2>
          </div>

          <div className="space-y-8">
            <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Revenue Stability (As Bookings Become Uncertain)
              </h3>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Traditional bookings are unpredictable. One client cuts budget.
                Another goes with AI. Your models' income fluctuates month to
                month.
              </p>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Likelee flattens that curve by creating{" "}
                <span className="font-bold">RECURRING, PREDICTABLE income</span>
                .
              </p>
              <p className="text-lg text-gray-700 mb-6">Your models earn:</p>
              <div className="space-y-3 text-lg text-gray-700 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>
                    Fixed retainers from long-term licensing deals (stable
                    monthly income)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>
                    Renewals on evergreen licenses (brands keep using photos)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>
                    New licensing opportunities (brands keep discovering your
                    roster)
                  </p>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("talentAgency.twoWays.recurring.title")}
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                {t("talentAgency.twoWays.recurring.description")}{" "}
                <span className="font-bold text-indigo-600">
                  {t("talentAgency.twoWays.recurring.highlight")}
                </span>{" "}
                {t("talentAgency.twoWays.recurring.suffix")}
              </p>
            </Card>

            <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                One Dashboard. All Revenue Streams.
              </h3>
              <p className="text-lg text-gray-700 mb-6">
                No spreadsheets. No manual tracking. See:
              </p>
              <div className="space-y-3 text-lg text-gray-700 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Active licenses (fixed and recurring)</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Revenue by model, by brand, by region</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Renewal dates (so you know when to upsell)</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Royalty payments (automatic)</p>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("talentAgency.twoWays.fixed.title")}
              </h3>
              <p className="text-base text-gray-700 mb-6 leading-relaxed">
                {t("talentAgency.twoWays.fixed.description")}{" "}
                <span className="font-bold text-purple-600">
                  {t("talentAgency.twoWays.fixed.highlight")}
                </span>
                {t("talentAgency.twoWays.fixed.suffix")}
              </p>
              <p className="text-base text-gray-700 leading-relaxed">
                {t("talentAgency.twoWays.fixed.example")}{" "}
                <span className="font-bold text-purple-600">
                  {t("talentAgency.twoWays.fixed.exampleHighlight")}
                </span>{" "}
                {t("talentAgency.twoWays.fixed.exampleSuffix")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 5: How It Actually Works */}
      <section id="how-it-works" className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("talentAgency.howItWorks.title")}
            </h2>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("talentAgency.howItWorks.step1")}
              </p>
              <p className="text-lg text-gray-700 mb-4">
                Your models see a dashboard where they can:
              </p>
              <div className="space-y-3 text-lg text-gray-700">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>View their licensed likenesses</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Choose payment preferences (fixed vs. recurring)</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Approve or deny licensing requests</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Track earnings</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 md:p-12 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-black rounded-none">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 border-2 border-black flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">2</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Brands Browse & Request
                </h3>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("talentAgency.howItWorks.step2")}
              </p>
              <p className="text-lg text-gray-700 mb-4">
                They find model they want and submit a licensing request with:
              </p>
              <div className="space-y-3 text-lg text-gray-700">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <p>Use case (billboard, website, commercial, etc.)</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <p>Duration or ongoing?</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <p>Regions</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <p>Proposed payment</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 md:p-12 bg-white border-2 border-black rounded-none">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 border-2 border-black flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">3</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Your Team Approves
                </h3>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("talentAgency.howItWorks.step3")}
              </p>
              <div className="space-y-4 text-lg text-gray-700">
                <p>
                  <span className="font-bold">If yes:</span> Approve and set
                  terms.
                </p>
                <p>
                  <span className="font-bold">If no:</span> Reject and
                  counter-offer.
                </p>
                <p>
                  <span className="font-bold">If recurring:</span> Set monthly
                  retainer. Brand pays into escrow monthly.
                </p>
                <p>
                  <span className="font-bold">If fixed:</span> Set one-time
                  price. Brand pays upfront into escrow.
                </p>
              </div>
            </Card>

            <Card className="p-8 md:p-12 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-black rounded-none">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 border-2 border-black flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">4</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Payment Protected in Escrow
                </h3>
              </div>
              <div className="space-y-3 text-lg text-gray-700">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <p>
                    Brand pays full amount (fixed) or first month (recurring)
                    into escrow
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <p>Money doesn't release until you approve the deal</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <p>Model's likeness gets licensed</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <p>After 48 hours of no disputes, payment auto-releases</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <p>
                    Likelee takes its platform fee (5–10% depending on your plan
                    tier)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <p>Remaining amount goes to your agency account</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <p>You decide how to split with your model</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 md:p-12 bg-white border-2 border-black rounded-none">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 border-2 border-black flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">5</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Track Everything in One Place
                </h3>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("talentAgency.howItWorks.step4")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 6: Real Agency Wins */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("talentAgency.whyAgenciesWin.title")}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Social Agency: 20-Model Roster
              </h3>
              <div className="space-y-4 text-lg text-gray-700 mb-6">
                <p>
                  <span className="font-bold">Before Likelee:</span> Managed
                  social influencers. One-time campaign payments. Models churned
                  to other agencies.
                </p>
                <p>
                  <span className="font-bold">With Likelee:</span> Started
                  licensing models for evergreen brand content. Influencers
                  making $2K–$5K/month recurring. Model churn dropped 40%.
                  Agency now manages both campaigns AND licensing.
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-black rounded-none">
                <p className="text-xl font-bold text-indigo-600">
                  New revenue: $48K/month recurring
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  (20 models × $200–$300 avg. per model, after their cut to
                  models)
                </p>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("talentAgency.whyAgenciesWin.revenue.title")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("talentAgency.whyAgenciesWin.revenue.description")}
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="flex items-center gap-3 mb-4">
                <FileCheck className="w-8 h-8 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  Smart Contracts
                </h3>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("talentAgency.whyAgenciesWin.retention.title")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("talentAgency.whyAgenciesWin.retention.description")}
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="w-8 h-8 text-indigo-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  Watermarked Assets
                </h3>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("talentAgency.whyAgenciesWin.protection.title")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("talentAgency.whyAgenciesWin.protection.description")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 10: 3-Year Projection */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Real Numbers: 3-Year Projection
            </h2>
            <p className="text-xl text-gray-600">
              Scenario: 50-Model Boutique Agency
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Year 1</h3>
              <div className="space-y-4 text-gray-700 mb-6">
                <p>20 models onboarded</p>
                <p>Mix of fixed renewals + recurring licenses</p>
                <p>
                  Average licensing revenue per model: $300/month (recurring) +
                  $2K/quarter (fixed renewals)
                </p>
                <p>
                  You set your take rate (keep 30%, give models 70%? 50/50? Your
                  choice.)
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-black rounded-none">
                <p className="text-sm text-gray-600 mb-2">
                  (after Likelee's platform fee)
                </p>
                <p className="text-2xl font-bold text-indigo-600">
                  Agency revenue: $54K
                </p>
              </div>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Year 2</h3>
              <div className="space-y-4 text-gray-700 mb-6">
                <p>40 models onboarded (word-of-mouth from Year 1)</p>
                <p>Existing models renewing</p>
                <p>More brands finding the platform</p>
              </div>
              <div className="p-4 bg-white border-2 border-black rounded-none">
                <p className="text-2xl font-bold text-indigo-600">
                  Agency revenue: $180K
                </p>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Year 3</h3>
              <div className="space-y-4 text-gray-700 mb-6">
                <p>50 models active</p>
                <p>Strong renewal pipeline</p>
                <p>Brands actively searching for your roster</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-black rounded-none">
                <p className="text-2xl font-bold text-indigo-600">
                  Agency revenue: $360K+
                </p>
              </div>
            </Card>
          </div>

          <Card className="p-8 bg-gradient-to-r from-indigo-600 to-purple-600 border-2 border-black rounded-none text-center mt-12">
            <p className="text-xl text-white font-semibold">
              This is recurring revenue. No new shoots. Same team managing. You
              choose how to split with models.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 11: FAQ */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="item-1"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                How much commission do we take as an agency?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                That's up to you. You decide how to split licensing revenue with
                your models. Likelee takes 5–10% (platform fee, depending on
                your plan tier). The remaining 90–95% goes to your agency
                account. You then decide: 50/50 split with models? 70/30? 60/40?
                Whatever keeps your models happy and your business profitable.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-2"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What if a brand wants both fixed-term AND ongoing? Can they do
                that?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. Example: Brand licenses model for a 6-month billboard
                campaign (fixed), then wants to keep the photo on their website
                indefinitely (recurring). Two separate licenses. Two separate
                payments. Both managed in one dashboard.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-3"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                How do you enforce ongoing licenses? What if the brand says they
                took the photo down but it's still up?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Great question. Two ways: (1) Smart contract automation: We
                track usage via watermarked assets. If we detect the photo is no
                longer live on their site, payment auto-stops. (2) Brand
                attestation: Automated monthly reminder asking "Are you still
                actively using this model's likeness?" One-click yes/no. False
                claims are prosecuted under contract law. Models can also revoke
                the license anytime if they suspect misuse.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-4"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What if a brand wants to extend a fixed-term license?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Perfect. That's a renewal opportunity. When the license expires,
                you contact the brand: "Your 6-month billboard license expires
                next month. Want to renew?" Brand says yes. New deal. New
                payment. New revenue for you and the model. This is how you
                scale: renewals are easier than new deals.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-5"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can models earn the same recurring way as other creators on
                Likelee?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes, that's the whole point. Models can choose fixed or
                recurring, just like AI creators and influencers. Same escrow
                protection. Same control. Just different payment structures
                because different use cases warrant different compensation.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-6"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What if a model wants to pause their recurring license
                temporarily?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                One click. License pauses. Payments pause. No disputes. When
                they want to resume, they resume.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-7"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What plan tier should we choose?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Depends on your roster size and projected volume. Starter is 15+
                models, Pro is 30+ models, Enterprise is for large networks.
                Likelee's platform fee is 5–10% depending on tier. Contact sales
                to discuss what works for your agency.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Section 12: The Bigger Picture */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              The Bigger Picture
            </h2>
            <p className="text-xl text-gray-600">
              You're Not Just Managing Talent Anymore. You're Future-Proofing
              Your Business.
            </p>
          </div>

          <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none mb-8">
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              The industry is at an inflection point. AI is disrupting
              traditional booking. Brands are experimenting. Budgets are
              shifting. Booking frequency is becoming less predictable.
            </p>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Agencies that adapt now will dominate. Agencies that don't will
              watch their talent portfolios shrink.
            </p>
            <p className="text-lg text-gray-700 mb-6">You can either:</p>
            <div className="space-y-4 text-lg text-gray-700 mb-8">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                <p>
                  Hold on to the traditional booking model and hope AI doesn't
                  cannibalize it (spoiler: it will, somewhat)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <p>
                  Embrace licensing and create a SECOND revenue stream that
                  actually GROWS as AI adoption increases
                </p>
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">
              Likelee helps you do #2.
            </p>
          </Card>

          <Card className="p-8 md:p-12 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-black rounded-none mb-8">
            <p className="text-lg text-gray-700 mb-4">
              By positioning your roster as:
            </p>
            <div className="space-y-3 text-lg text-gray-700 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <p>Real talent in an AI world (authentic alternative)</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <p>
                  Recession-proof income (licensing grows as bookings shift)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <p>
                  Future-proofed careers (models stay loyal because they're
                  secure)
                </p>
              </div>
            </div>
            <p className="text-lg text-gray-700 mb-4">You build:</p>
            <div className="space-y-3 text-lg text-gray-700">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <p>A moat against disruption</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <p>Recurring revenue that scales</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <p>Model retention that competitors can't match</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <p>
                  An agency that thrives in the AI era, not just survives it
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-8 bg-gradient-to-r from-indigo-600 to-purple-600 border-2 border-black rounded-none text-center">
            <p className="text-xl text-white font-semibold mb-4">
              The agencies that win will be the ones that own both the booking
              pipeline AND the licensing pipeline.
            </p>
            <p className="text-xl text-white font-bold">
              Likelee gives you the infrastructure to build both.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 13: Your Next Move */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Your Next Move
            </h2>
            <p className="text-xl text-gray-600">Start Small. Scale Fast.</p>
          </div>

          <p className="text-lg text-gray-700 text-center mb-12">
            You don't need to onboard all 100 models on day one.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Phase 1: Pilot
              </h3>
              <div className="space-y-3 text-gray-700">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Onboard 10–15 top models</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Get them licensing opportunities</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Let them earn</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Document wins</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Phase 2: Expand
              </h3>
              <div className="space-y-3 text-gray-700">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Onboard more models</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Show other models what their peers are earning</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Word spreads</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>More brands discover your roster</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Phase 3: Dominance
              </h3>
              <div className="space-y-3 text-gray-700">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Your roster is THE place brands go to find talent</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Models want to join your agency because it's lucrative</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Recurring revenue stream scales</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t("talentAgency.cta.title")}
          </h2>
          <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8">
            {t("talentAgency.cta.description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-white hover:bg-gray-100 text-indigo-600 border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
            >
              {t("talentAgency.cta.bookDemo")}
            </Button>
            <Button
              onClick={scrollToHowItWorks}
              variant="outline"
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-transparent hover:bg-white/10 text-white border-2 border-white rounded-none"
            >
              {t("talentAgency.cta.howItWorks")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
