import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Shield,
  Users,
  DollarSign,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TalentAgency() {
  const navigate = useNavigate();

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
            Your Talent Could Earn 10x More
          </h1>
          <p className="text-lg md:text-xl font-semibold mb-4">
            Turn one-time shoots into recurring revenue
          </p>
          <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8">
            Traditional bookings pay $1.5K once and you're done. Likelee
            licensing pays monthly, forever, and your roster earns consistently.
          </p>
          <Button
            onClick={() => navigate(createPageUrl("SalesInquiry"))}
            className="h-12 px-10 text-lg font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all"
          >
            Book Demo
          </Button>
        </div>
      </section>

      {/* Section 1: Bookings are dropping */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Bookings are dropping, licensing is rising.
          </h2>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed">
            Brands are shifting budgets toward AI experiments, but they still
            need real verified talent for authentic campaigns. Likelee creates
            recurring income streams for your talent while booking frequency
            fluctuates. You earn recurring commission every month they stay
            licensed.
          </p>
        </div>
      </section>

      {/* Section 2: Two Ways to Earn */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Two Ways to Earn
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Recurring Monthly Licensing */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black shadow-xl rounded-none flex flex-col">
              <div className="w-16 h-16 bg-indigo-600 flex items-center justify-center mb-6">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Recurring Monthly Licensing
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                Brand uses your talent's likeness on their website indefinitely
                and pays{" "}
                <span className="font-bold text-indigo-600">
                  $400 every month
                </span>{" "}
                while those photos remain live.
              </p>
            </Card>

            {/* Fixed-Term Licensing */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black shadow-xl rounded-none flex flex-col">
              <div className="w-16 h-16 bg-purple-600 flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Fixed-Term Licensing
              </h3>
              <p className="text-base text-gray-700 mb-6 leading-relaxed">
                Brand licenses your talent's face for a specific campaign
                duration like 6 months, pays{" "}
                <span className="font-bold text-purple-600">$2.5K upfront</span>
                , and renews at the end of the term.
              </p>
              <p className="text-base text-gray-700 leading-relaxed">
                Your talent earns $2.5K per renewal cycle. Over three years,
                that's{" "}
                <span className="font-bold text-purple-600">
                  $7.5K from the same talent
                </span>{" "}
                versus $1.5K with traditional booking.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 3: How It Works */}
      <section id="how-it-works" className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                Add your talent to Likelee so they can review licensing requests
                and watch their earnings accumulate in real time.
              </p>
            </Card>

            {/* Step 2 */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                Brands discover and request licenses by submitting their
                proposed use, territory, duration, and payment amount directly
                through the platform.
              </p>
            </Card>

            {/* Step 3 */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                You review and approve terms, set the final payment amount, and
                the brand pays into escrow so the transaction is protected.
              </p>
            </Card>

            {/* Step 4 */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">4</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                Money releases after 48 hours of no disputes straight to your
                agency account, where you decide how to split earnings with your
                talent.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 4: Why Agencies Win */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Agencies Win
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Recurring Revenue That Scales */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <DollarSign className="w-12 h-12 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Recurring Revenue That Scales
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Year one brings in $50K from licensing. Year two you're at
                $150K. Year three breaks $300K. You're using the same team, the
                same talent roster, and conducting zero additional shoots to
                reach that growth.
              </p>
            </Card>

            {/* Talent Stays Because They Feel Secure */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <Users className="w-12 h-12 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Talent Stays Because They Feel Secure
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Licensing income replaces the volatility of booking cycles, so
                your talent doesn't panic when bookings slow down or jump to
                competing agencies. They know they're earning predictable money
                with you.
              </p>
            </Card>

            {/* Legal Protection Built In */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <Shield className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Legal Protection Built In
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Every license is verified and tracked with smart contracts that
                spell out exactly what the brand can do, for how long, and in
                which regions. Everything aligns with SAG-AFTRA standards and
                GDPR compliance so you're never exposing your talent legally.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 py-20 bg-[#0D1B3A] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Adapt Now or Shrink Later
          </h2>
          <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8">
            The agencies thriving right now are the ones that own both the
            traditional booking pipeline and the emerging AI landscape
            simultaneously. Likelee gives you the infrastructure to build and
            manage both at scale, turning your existing roster into a recurring
            revenue engine.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-12 px-10 text-lg font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all"
            >
              Book a Demo
            </Button>
            <Button
              onClick={() => {
                const el = document.getElementById("how-it-works");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="h-12 px-10 text-lg font-medium bg-white hover:bg-gray-100 text-gray-900 rounded-md transition-all"
            >
              See How It Works
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
