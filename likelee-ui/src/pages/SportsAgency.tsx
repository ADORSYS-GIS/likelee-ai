import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  DollarSign,
  Users,
  Shield,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SportsAgency() {
  const navigate = useNavigate();

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Sports Agency Solutions",
      description:
        "Turn your athletes into year-round earners with NIL licensing that grows while booking slows.",
      provider: {
        "@type": "Organization",
        name: "Likelee",
        url: "https://likelee.ai",
      },
      serviceType: "Sports Agency NIL Platform",
      areaServed: "Worldwide",
      audience: {
        "@type": "Audience",
        audienceType: "Sports Agencies, Athlete Representatives",
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

  const scrollToHowItWorks = () => {
    const el = document.getElementById("how-it-works");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative px-6 py-20 overflow-hidden bg-[#0D1B3A] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Turn Your Athletes Into Year-Round Earners
          </h1>
          <h2 className="text-xl md:text-2xl font-semibold mb-4">
            NIL licensing that grows while booking slows
          </h2>
          <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8">
            Traditional endorsements pay once. Likelee licensing pays monthly,
            forever. Your athletes earn recurring revenue from their name,
            image, and likeness while you manage contracts in one place and
            collect commission on every renewal.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-12 px-10 text-lg font-medium bg-[#32C8D1] hover:bg-[#2AB5BE] text-white rounded-md transition-all"
            >
              Book Demo
            </Button>
            <Button
              onClick={scrollToHowItWorks}
              className="h-12 px-10 text-lg font-medium bg-white hover:bg-gray-100 text-gray-900 rounded-md transition-all"
            >
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Section 1: Endorsement Deals Aren't Enough Anymore */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Endorsement Deals Aren't Enough Anymore
          </h2>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed">
            Your athletes are looking for stable income beyond traditional
            sponsorships. Endorsement opportunities are unpredictable and
            one-time. Likelee creates additional revenue streams where athletes
            earn recurring money from brands using their likeness for marketing,
            social content, and digital campaigns without requiring new
            contracts each time.
          </p>
        </div>
      </section>

      {/* Section 2: Two NIL Revenue Streams */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Two NIL Revenue Streams
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Fixed-Term NIL Licensing */}
            <Card className="p-10 md:p-12 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-16 h-16 bg-green-600 flex items-center justify-center mb-6">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Fixed-Term NIL Licensing
              </h3>
              <p className="text-base text-gray-700 mb-6 leading-relaxed">
                Brand licenses athlete's image for a specific campaign duration
                like 6 months, pays{" "}
                <span className="font-bold text-green-600">$5K upfront</span>,
                and can renew the agreement when it expires.
              </p>
              <p className="text-base text-gray-700 leading-relaxed">
                Your athlete earns $5K per renewal cycle. Over three years,
                that's{" "}
                <span className="font-bold text-green-600">
                  $15K from the same likeness
                </span>{" "}
                versus a single $5K traditional endorsement deal.
              </p>
            </Card>

            {/* Recurring Monthly NIL */}
            <Card className="p-10 md:p-12 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-16 h-16 bg-green-600 flex items-center justify-center mb-6">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Recurring Monthly NIL
              </h3>
              <p className="text-base text-gray-700 mb-6 leading-relaxed">
                Brand uses athlete's image on their website or in ongoing
                marketing and pays{" "}
                <span className="font-bold text-green-600">
                  $1K every month
                </span>{" "}
                while those assets remain active.
              </p>
              <p className="text-base text-gray-700 leading-relaxed">
                Your athlete controls the arrangement and can revoke access
                anytime they want. Over three years, that same athlete earns{" "}
                <span className="font-bold text-green-600">
                  $36K versus a one-time $5K endorsement payment
                </span>
                .
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 3: The Math */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              The Math
            </h2>
          </div>

          <Card className="p-4 md:p-5 bg-white border-2 border-black rounded-none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-4 px-4 font-bold text-gray-900">
                      Scenario
                    </th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">
                      Traditional
                    </th>
                    <th className="text-left py-4 px-4 font-bold text-[#32C8D1]">
                      Likelee
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 text-gray-700">
                      Sports drink endorsement (1 year)
                    </td>
                    <td className="py-4 px-4 text-gray-700">$5K</td>
                    <td className="py-4 px-4 text-[#32C8D1] font-semibold">
                      $5K + renewals
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 text-gray-700">
                      Recurring brand partnership (ongoing)
                    </td>
                    <td className="py-4 px-4 text-gray-700">$5K</td>
                    <td className="py-4 px-4 text-[#32C8D1] font-semibold">
                      $1K/mo = $36K/3yrs
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-gray-700">
                      Apparel brand NIL licensing (6 mo)
                    </td>
                    <td className="py-4 px-4 text-gray-700">$3K</td>
                    <td className="py-4 px-4 text-[#32C8D1] font-semibold">
                      $5K + renewals
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-center text-xl font-semibold text-gray-900 mt-8">
            Same athlete. Multiple income streams.{" "}
            <span className="text-[#32C8D1]">2-7x more earning potential.</span>
          </p>
        </div>
      </section>

      {/* Section 4: How It Works */}
      <section id="how-it-works" className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <Card className="p-4 md:p-5 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-start gap-6">
              <div className="w-12 h-12 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                Add your athletes to Likelee so brands can discover their
                verified likeness rights, review past sponsorships, and submit
                licensing requests directly.
              </p>
            </Card>

            {/* Step 2 */}
            <Card className="p-4 md:p-5 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-start gap-6">
              <div className="w-12 h-12 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                Brands request NIL licenses by specifying their intended use,
                campaign duration, territories, and proposed compensation
                through the platform.
              </p>
            </Card>

            {/* Step 3 */}
            <Card className="p-4 md:p-5 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-start gap-6">
              <div className="w-12 h-12 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                You review and approve terms, set the final compensation amount,
                and the brand pays into escrow so the transaction is protected.
              </p>
            </Card>

            {/* Step 4 */}
            <Card className="p-4 md:p-5 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-start gap-6">
              <div className="w-12 h-12 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">4</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                Money releases after 48 hours of no disputes straight to your
                agency account, where you decide how to split earnings with your
                athlete.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 5: Why Sports Agencies Win */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Sports Agencies Win
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Diversified Athlete Income */}
            <Card className="p-10 md:p-12 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <DollarSign className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Diversified Athlete Income
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                Traditional endorsements are volatile and unpredictable. NIL
                licensing creates stable monthly income that compounds over
                time.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                Year one brings in $60K from athlete licensing. Year two you're
                at $180K. Year three breaks $360K. Same roster. Same team. No
                additional negotiation burden.
              </p>
            </Card>

            {/* Athletes Stay Because They're Protected */}
            <Card className="p-10 md:p-12 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <Users className="w-12 h-12 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Athletes Stay Because They're Protected
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Recurring NIL income replaces the uncertainty of endorsement
                deals, so your athletes don't chase other representation or feel
                financially vulnerable. They know they're earning predictable
                money with you while you manage every licensing agreement
                legally.
              </p>
            </Card>

            {/* Full Compliance and Control */}
            <Card className="p-10 md:p-12 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <Shield className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Full Compliance and Control
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Every NIL license is verified with smart contracts that specify
                exactly what the brand can do, for how long, and in which
                regions. Everything aligns with NCAA regulations, state NIL
                laws, and player union standards so you're never exposing your
                athletes to legal risk.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 6: Verified Athlete Access */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Verified Athlete Access
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* What You Get */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                What You Get:
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                  <p className="text-base text-gray-700">
                    Verified identity (government ID matched)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                  <p className="text-base text-gray-700">
                    Confirmed NIL ownership (athlete controls their likeness)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                  <p className="text-base text-gray-700">
                    Pre-cleared licensing (smart contracts ready)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                  <p className="text-base text-gray-700">
                    One-click licensing (SAG-AFTRA aligned agreements)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                  <p className="text-base text-gray-700">
                    Repeatable usage (license the same athlete across multiple
                    brand campaigns)
                  </p>
                </div>
              </div>
            </Card>

            {/* Why It Matters */}
            <Card className="p-8 md:p-10 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Why It Matters:
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                Your compliance team spends hours on NIL contracts and
                verification. Likelee eliminates that friction and puts verified
                athletes in front of brands actively looking to license NIL
                rights.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 py-20 bg-[#0D1B3A] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Adapt or Watch Opportunities Pass
          </h2>
          <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8">
            Athletes today expect diversified income streams, not just one-time
            endorsements. The agencies capturing market share are the ones that
            offer stable recurring NIL revenue alongside traditional
            sponsorships. Likelee gives you the infrastructure to deliver both
            at scale.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-12 px-10 text-lg font-medium bg-[#32C8D1] hover:bg-[#2AB5BE] text-white rounded-md transition-all"
            >
              Book a Demo
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Faces"))}
              className="h-12 px-10 text-lg font-medium bg-white hover:bg-gray-100 text-gray-900 rounded-md transition-all"
            >
              Explore Athlete Marketplace
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
