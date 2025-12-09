import React, { useEffect } from "react";
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
      <section className="relative px-6 pt-16 pb-12 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-gray-100 text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-none border-2 border-black">
              For Talent & Modeling Agencies
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
              Your Talent Could Earn 10x More
            </h1>
            <div className="max-w-4xl mx-auto mb-8">
              <p className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
                Turn one-time shoots into recurring revenue
              </p>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6">
                Traditional bookings pay $1.5K once and you're done. Likelee licensing pays monthly, forever, and
                your roster earns consistently.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate(createPageUrl("SalesInquiry"))}
                className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
              >
                Book a Demo
              </Button>
              <Button
                onClick={scrollToHowItWorks}
                variant="outline"
                className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium border-2 border-black rounded-none hover:bg-gray-50"
              >
                See How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: The Problem (And the Opportunity) */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              The Problem (And the Opportunity)
            </h2>
            <p className="text-xl text-gray-600">The Booking Era is Changing</p>
          </div>

          <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none mb-12">
            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              Your agency has thrived on one model: book shoots, collect fees,
              move on.
            </p>
            <p className="text-xl font-bold text-gray-900 mb-6">
              But here's what's happening:
            </p>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Brands are experimenting with AI. They're testing AI-generated
              models. Testing AI video production. Testing faster, cheaper
              alternatives.
            </p>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Does that mean they'll stop booking real talent entirely? No. But
              it means:
            </p>
            <div className="space-y-3 text-lg text-gray-700 mb-8">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <p>Booking frequency might decrease</p>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <p>Booking rates face pressure</p>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <p>
                  Client budgets get split between shoots AND AI experiments
                </p>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <p>Your models' year-round income becomes less predictable</p>
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">
              Traditional agencies are vulnerable right now.
            </p>
          </Card>

          <Card className="p-8 md:p-12 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-black rounded-none mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              But here's the opportunity:
            </h3>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              While brands explore AI, they still need{" "}
              <span className="font-bold">real people with real consent</span>.
              Real faces for authentic campaigns. Real voices for real stories.
              Verified talent that audiences trust.
            </p>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Likelee positions your agency—and your models—as the{" "}
              <span className="font-bold">
                antidote to AI's uncanny valley problem
              </span>
              . Real talent. Real consent. Real trust.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              And more importantly: Likelee gives your models{" "}
              <span className="font-bold">recurring revenue that GROWS</span> as
              booking uncertainty increases.
            </p>
          </Card>

          <Card className="p-8 bg-gradient-to-r from-indigo-600 to-purple-600 border-2 border-black rounded-none text-center">
            <p className="text-xl text-white font-semibold leading-relaxed">
              Your models aren't dependent on shoot bookings anymore. They're
              earning from licensing—which is MORE stable, MORE predictable, and
              GROWS as more brands realize they need verified human talent in an
              AI world.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 2: Two Ways Your Models Can Earn */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Two Ways Your Models Can Earn
            </h2>
            <p className="text-xl text-gray-600">
              You don't have to choose one way. Your models choose the way that
              fits each opportunity.
            </p>
          </div>

          <div className="space-y-12">
            {/* Fixed-Term Licensing */}
            <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 border-2 border-black flex items-center justify-center">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Fixed-Term Licensing
                </h3>
              </div>
              <p className="text-xl text-gray-700 mb-6 font-semibold">
                One payment. Clear expiration. Renewal opportunity.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                <span className="font-bold">Best for:</span> Billboards, TV
                commercials, seasonal campaigns, specific brand activations
              </p>

              <div className="mb-8">
                <h4 className="text-xl font-bold text-gray-900 mb-4">
                  How it works:
                </h4>
                <div className="space-y-3 text-lg text-gray-700">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                    <p>
                      Brand licenses model's face for a specific use and
                      duration
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                    <p>
                      Example: Billboard campaign for 6 months = $2.5K upfront
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                    <p>
                      After 6 months: License expires. Brand renews or finds new
                      model
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                    <p>Your agency gets commission on each renewal</p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="text-xl font-bold text-gray-900 mb-4">
                  Why models prefer this:
                </h4>
                <div className="space-y-3 text-lg text-gray-700">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                    <p>Clear, predictable income</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                    <p>Professional (not gig-based)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                    <p>Works for defined campaigns</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                    <p>No tracking ambiguity</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-black rounded-none">
                <h4 className="text-xl font-bold text-gray-900 mb-4">
                  Real example:
                </h4>
                <div className="space-y-3 text-gray-700">
                  <p>
                    <span className="font-bold">Traditional:</span> Model shoots
                    billboard. Gets $1.5K. Billboard runs for 8 months. Model
                    never sees another dime.
                  </p>
                  <p>
                    <span className="font-bold">Likelee:</span> Model licenses
                    face for 6-month billboard. Gets $2.5K. Brand renews at
                    month 7. Model gets another $2.5K. Year 2: $2.5K again.
                  </p>
                  <p className="text-xl font-bold text-indigo-600">
                    3-year total: $7.5K vs. $1.5K
                  </p>
                </div>
              </div>
            </Card>

            {/* Ongoing Monthly Licensing */}
            <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 border-2 border-black flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Ongoing Monthly Licensing
                </h3>
              </div>
              <p className="text-xl text-gray-700 mb-6 font-semibold">
                Recurring income. Models earn while brands use. Payments stop
                when usage stops.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                <span className="font-bold">Best for:</span> Websites,
                e-commerce product photos, social media rotation, evergreen
                content
              </p>

              <div className="mb-8">
                <h4 className="text-xl font-bold text-gray-900 mb-4">
                  How it works:
                </h4>
                <div className="space-y-3 text-lg text-gray-700">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                    <p>
                      Brand licenses model's likeness for ongoing, indefinite
                      use
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                    <p>
                      Brand pays monthly (into escrow—protected) while photos
                      are actively used
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                    <p>If brand takes photos down, payments stop</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                    <p>Model can pause, revoke, or renew anytime</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                    <p>
                      Same payment protection as other Likelee creators
                      (auto-release after 48 hours)
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="text-xl font-bold text-gray-900 mb-4">
                  Why models prefer this:
                </h4>
                <div className="space-y-3 text-lg text-gray-700">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                    <p>Passive income while brand uses their face</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                    <p>Fair (model benefits from ongoing value)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                    <p>They stay in control (can revoke anytime)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                    <p>
                      Incentivizes brands to keep using high-performing models
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-black rounded-none">
                <h4 className="text-xl font-bold text-gray-900 mb-4">
                  Real example:
                </h4>
                <div className="space-y-3 text-gray-700">
                  <p>
                    <span className="font-bold">Scenario:</span> Brand wants
                    model's photo on their e-commerce site indefinitely
                  </p>
                  <p>
                    <span className="font-bold">Traditional:</span> Model gets
                    $1.5K upfront. Brand uses photo for 3 years. Model earns
                    $1.5K total.
                  </p>
                  <p>
                    <span className="font-bold">Likelee:</span> Model earns
                    $400/month while photos are live. 3 years = $14.4K. If brand
                    takes them down, payments stop.
                  </p>
                  <p className="text-xl font-bold text-purple-600">
                    3-year total: $14.4K vs. $1.5K
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 3: Your Transition Into AI Media */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Your Transition Into AI Media
            </h2>
            <p className="text-xl text-gray-600">
              Likelee Is Your Insurance Policy
            </p>
          </div>

          <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none mb-8">
            <p className="text-xl text-gray-900 mb-6 leading-relaxed">
              The AI era isn't a threat to real talent—it's an opportunity to
              position talent differently.
            </p>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Here's what's happening:
            </h3>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Brands want AI speed. But they want human authenticity.
            </p>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              They want to use AI for rapid iteration and scaled production. But
              they also want real people for campaigns that need trust, emotion,
              and human connection.
            </p>

            <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-black rounded-none mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">
                Smart agencies are already positioning their rosters this way:
              </h4>
              <p className="text-lg text-gray-700 italic">
                "Our models aren't competing with AI. Our models are the
                AUTHENTIC alternative. Real faces. Real consent. Real people."
              </p>
            </div>

            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              But here's the problem: If your models only make money from
              traditional shoots, and shoots decrease, they leave your agency.
            </p>
            <p className="text-xl font-bold text-gray-900 mb-6">
              Likelee solves this by creating a NEW income stream that actually
              GROWS as AI adoption increases.
            </p>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Why? Because as more brands experiment with AI, they realize they
              need verified human talent MORE, not less. And they're willing to
              license real talent for:
            </p>
            <div className="space-y-3 text-lg text-gray-700 mb-8">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <p>
                  Authentic campaign elements (mixed with AI-generated assets)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <p>Real testimonials and human-centric content</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <p>Fallback content if AI-generated content underperforms</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                <p>Compliance-heavy industries that need real people</p>
              </div>
            </div>
            <p className="text-xl font-bold text-indigo-600">
              Your models earn MORE as booking uncertainty increases.
            </p>
          </Card>

          <Card className="p-8 bg-gradient-to-r from-indigo-600 to-purple-600 border-2 border-black rounded-none text-center">
            <p className="text-xl text-white font-semibold leading-relaxed">
              You're not defending against AI. You're capitalizing on the demand
              for real talent in an AI world.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 4: Why Agencies Choose Likelee */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Agencies Choose Likelee
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
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                <span className="font-bold">Result:</span> Year-round, stable
                revenue that doesn't depend on booking cycles.
              </p>
              <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-black rounded-none">
                <h4 className="text-xl font-bold text-gray-900 mb-4">
                  Real example:
                </h4>
                <div className="space-y-3 text-gray-700">
                  <p>
                    Model X normally books 2 shoots/year at $1.5K each ={" "}
                    <span className="font-bold">$3K annual income</span> (with
                    uncertainty)
                  </p>
                  <p>
                    Model X licenses face to 3 brands at $300/month recurring ={" "}
                    <span className="font-bold">$10.8K annual income</span>{" "}
                    (predictable, recurring)
                  </p>
                  <p className="text-xl font-bold text-indigo-600 mt-4">
                    Even if bookings drop 50%, models still earn MORE—and it's
                    recurring.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 md:p-12 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Model Retention That Actually Works
              </h3>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Models leave when they feel vulnerable. And right now, many feel
                vulnerable as AI disruption grows.
              </p>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Likelee changes that by giving models something traditional
                agencies can't:{" "}
                <span className="font-bold">recession-proof income</span>.
              </p>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                When booking frequency decreases, licensing income increases.
                Models that have both revenue streams don't panic. They don't
                chase AI jobs or sign with competing agencies. They know they're
                secure with you.
              </p>
              <p className="text-xl font-bold text-indigo-600">
                Result: Better retention, less churn, models that actively want
                to stay with you because you've future-proofed their career.
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
            </Card>

            <Card className="p-8 md:p-12 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Control & Protection
              </h3>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Every license is verified, watermarked, and trackable. Models
                trust the system. You trust the system. Brands can't abuse it.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                Plus: SAG-AFTRA aligned. GDPR compliant. DMCA protection. Your
                roster is legally protected.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 5: How It Actually Works */}
      <section id="how-it-works" className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How It Actually Works
            </h2>
          </div>

          <div className="space-y-8">
            <Card className="p-8 md:p-12 bg-white border-2 border-black rounded-none">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 border-2 border-black flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Upload Your Roster
                </h3>
              </div>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Add verified models to Likelee. We verify identity, protect
                likeness, create consent records.
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
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Brands/studios search your roster by: style, niche,
                demographics, experience.
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
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                You review the request. Is it on-brand? Safe? Fair payment?
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
              <p className="text-lg text-gray-700 mb-6">
                Usage dashboard shows:
              </p>
              <div className="space-y-3 text-lg text-gray-700 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Active licenses (by model, by brand, by region)</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Expiration dates (so you know when to renew)</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Revenue by model (who's earning most?)</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p>Payment history (transparent for models)</p>
                </div>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                For recurring licenses: Real-time tracking. If brand stops using
                model's photo, you know. Payments stop. Done.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 6: Real Agency Wins */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Real Agency Wins
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
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Modeling Agency: 100-Model Roster
              </h3>
              <div className="space-y-4 text-lg text-gray-700 mb-6">
                <p>
                  <span className="font-bold">Before:</span> Traditional
                  bookings only. Shoots, payments, done. Renewal rate: 30%.
                </p>
                <p>
                  <span className="font-bold">With Likelee:</span> Offered
                  models both fixed-term and recurring licensing. Some models
                  licensing for e-commerce sites. Some licensing for ongoing
                  social. Revenue explosion.
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-black rounded-none">
                <p className="text-xl font-bold text-indigo-600">
                  New revenue: $150K/month
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  (mix of fixed renewals + recurring licenses, after their cut
                  to models)
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 7: The Math */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              The Math: Traditional vs. Likelee
            </h2>
          </div>

          <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="pb-4 pr-4 text-lg font-bold text-gray-900">
                      Scenario
                    </th>
                    <th className="pb-4 px-4 text-lg font-bold text-gray-900">
                      Traditional
                    </th>
                    <th className="pb-4 px-4 text-lg font-bold text-gray-900">
                      Likelee (Fixed)
                    </th>
                    <th className="pb-4 pl-4 text-lg font-bold text-gray-900">
                      Likelee (Recurring)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 pr-4 text-gray-700">
                      Billboard (6 months)
                    </td>
                    <td className="py-4 px-4 text-gray-700">$1.5K one-time</td>
                    <td className="py-4 px-4 font-semibold text-indigo-600">
                      $2.5K one-time
                    </td>
                    <td className="py-4 pl-4 text-gray-700">N/A</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 pr-4 text-gray-700">
                      E-commerce (ongoing)
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      $1.5K one-time. Brand uses for 3 years.
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      $3K renewal each year
                    </td>
                    <td className="py-4 pl-4 font-semibold text-indigo-600">
                      $400/mo = $14.4K over 3 years
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 pr-4 text-gray-700">
                      TV Commercial (1 year)
                    </td>
                    <td className="py-4 px-4 text-gray-700">$3K one-time</td>
                    <td className="py-4 px-4 font-semibold text-indigo-600">
                      $5K one-time
                    </td>
                    <td className="py-4 pl-4 text-gray-700">
                      $500/mo if ongoing rotation
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 pr-4 text-gray-700">
                      Social Rotation (ongoing)
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      Per-post gig model
                    </td>
                    <td className="py-4 px-4 text-gray-700">Not applicable</td>
                    <td className="py-4 pl-4 font-semibold text-indigo-600">
                      $300–$500/mo
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 pr-4 text-gray-700">
                      Boutique magazine (6 months)
                    </td>
                    <td className="py-4 px-4 text-gray-700">$1.5K one-time</td>
                    <td className="py-4 px-4 font-semibold text-indigo-600">
                      $2K one-time
                    </td>
                    <td className="py-4 pl-4 text-gray-700">N/A</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-8 bg-gradient-to-r from-indigo-600 to-purple-600 border-2 border-black rounded-none text-center mt-8">
            <p className="text-xl text-white font-semibold">
              <span className="font-bold">The Pattern:</span> Likelee models
              earn 2–10× more for the same work, depending on use case.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 8: Protection & Compliance */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Protection & Compliance
            </h2>
            <p className="text-xl text-gray-600">
              Your Roster is Legally Protected
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-8 h-8 text-indigo-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  Verified Consent
                </h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Every license starts with explicit, documented consent. Brands
                can't claim "we didn't know."
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="flex items-center gap-3 mb-4">
                <FileCheck className="w-8 h-8 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  Smart Contracts
                </h3>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                Each license includes:
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <p>• Scope (what can it be used for)</p>
                <p>• Territory (which regions)</p>
                <p>• Duration (how long)</p>
                <p>• Compensation (how much)</p>
                <p>• Restrictions (what's off-limits)</p>
              </div>
              <p className="text-gray-700 leading-relaxed mt-4">
                All automated. All enforceable.
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="w-8 h-8 text-indigo-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  Watermarked Assets
                </h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Every image/video carries embedded verification. If a brand uses
                it outside agreed terms, we detect it.
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-8 h-8 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  SAG-AFTRA Aligned
                </h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Your agreements comply with union standards. Professional.
                Defensible. Model-friendly.
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-8 h-8 text-indigo-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  GDPR & CCPA Compliant
                </h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                No PII sold to third parties. Your models' data is sovereign.
                Privacy is protected.
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
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Future-Proof Your Agency?
          </h2>
          <p className="text-lg md:text-xl text-indigo-100 mb-6 leading-relaxed">
            The booking era is changing. Booking uncertainty is rising. The
            agencies that adapt will thrive. The ones that don't will shrink.
          </p>
          <p className="text-lg md:text-xl text-indigo-100 mb-10 leading-relaxed">
            Likelee isn't just a licensing platform. It's your transition into
            the AI media era—where your models earn MORE from licensing as
            bookings become less certain.
          </p>
          <p className="text-xl font-bold text-white mb-10">
            Let's talk about bringing your roster live and securing your
            agency's future.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-white hover:bg-gray-100 text-indigo-600 border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
            >
              Book a Demo
            </Button>
            <Button
              onClick={scrollToHowItWorks}
              variant="outline"
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-transparent hover:bg-white/10 text-white border-2 border-white rounded-none"
            >
              See How It Works
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
