import React, { useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  Shield,
  FileCheck,
  Eye,
  DollarSign,
  Lock,
  Users,
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AboutUs() {
  const { t } = useTranslation();
  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About Likelee",
      description: "Building infrastructure for agencies that scales with technology",
      url: "https://likelee.ai/about-us",
      mainEntity: {
        "@type": "Organization",
        name: "Likelee",
        description:
          "Infrastructure for talent agencies to manage traditional bookings and AI licensing in one place",
        foundingDate: "2024",
        mission:
          "Creating a new revenue model where booking gaps become earning opportunities, operations run on automation, and agencies scale without adding headcount",
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

  const principles = [
    {
      number: "1",
      title: "Agency Control, Always",
      description:
        "You approve every booking, adjust every price, decline any project. Full operational control.",
    },
    {
      number: "2",
      title: "Transparent Revenue Tracking",
      description:
        "See traditional bookings and AI licensing revenue in real-time. One dashboard, complete visibility.",
    },
    {
      number: "3",
      title: "Talent Protection Built-In",
      description:
        "Smart contracts specify exact usage rights, duration, and territory. Every license is tracked and revocable.",
    },
    {
      number: "4",
      title: "Operations First, Technology Second",
      description:
        "We build what solves today's agency challenges, not theoretical future problems.",
    },
  ];

  const approachSteps = [
    {
      step: "Step 1",
      title: "Add Your Talent",
      description:
        "Upload your roster with headshots and portfolios. Talent profiles become available for both traditional bookings and AI licensing requests.",
    },
    {
      step: "Step 2",
      title: "Brands Submit Requests",
      description:
        "Studios and brands browse your talent for traditional shoots or AI licensing campaigns. You see use case, duration, territory, and compensation upfront.",
    },
    {
      step: "Step 3",
      title: "You Control Every Deal",
      description:
        "Review requests in one dashboard. Approve traditional bookings, adjust AI licensing pricing, or decline. Complete agency control over both revenue streams.",
    },
    {
      step: "Step 4",
      title: "Automated Contract Generation",
      description:
        "System generates booking agreements for traditional shoots and smart contracts for AI licensing. No manual drafting, no legal bottlenecks.",
    },
    {
      step: "Step 5",
      title: "Protected Payment Processing",
      description:
        "Funds held in escrow for both traditional and AI deals. Automatic commission splits. Money releases directly to your agency account.",
    },
    {
      step: "Step 6",
      title: "Real-Time Revenue Tracking",
      description:
        "One dashboard shows traditional booking calendar and active AI licensing agreements. See which talent is earning from what, when contracts expire, and monthly recurring revenue.",
    },
  ];

  const users = [
    {
      profile: "Modeling Agencies",
      description:
        "Manage castings, runway bookings, and editorial shoots alongside AI licensing for e-commerce and advertising campaigns.",
    },
    {
      profile: "Sports Agencies",
      description:
        "Coordinate traditional endorsements and sponsorships while licensing athletes' NIL for AI-generated marketing content.",
    },
    {
      profile: "Talent Management Firms",
      description:
        "Handle traditional bookings for actors, influencers, and creators while monetizing their likeness during project gaps.",
    },
    {
      profile: "Boutique to Enterprise",
      description:
        "5-person shops to 200+ talent rosters. Same platform, scales to your size.",
    },
  ];

  const operations = [
    {
      icon: Shield,
      title: "Verification First",
      description:
        "Every creator passes identity checks before their avatar goes live. Bad actors don't get a platform.",
    },
    {
      icon: FileCheck,
      title: "Plain Language Contracts",
      description:
        "No legal mumbo-jumbo. Plain language agreements with automatic expiry dates and sunset clauses baked in.",
    },
    {
      icon: Eye,
      title: "Shared Ledger",
      description:
        "Both you and the brand see the same real-time record of every use, every payment, every expiration date.",
    },
    {
      icon: Lock,
      title: "Security by Design",
      description:
        "Biometric files encrypted at rest. No third-party data sales. No scraping. Your data is yours.",
    },
    {
      icon: Users,
      title: "Built With Users, Not For Users",
      description:
        "We only release features when creators, agencies, and studios confirm real-world need. No feature bloat.",
    },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Mission Section */}
      <section className="px-6 pt-12 pb-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Mission
          </h2>
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p className="text-xl font-semibold text-gray-900">
              In the age of AI, talent agencies need infrastructure that scales with technology, not against it.
            </p>
            <p>
              Likelee builds the platform for agencies to manage traditional bookings and AI licensing in one place. We're creating a new revenue model where booking gaps become earning opportunities, operations run on automation, and agencies scale without adding headcount.
            </p>
          </div>
        </div>
      </section>

      {/* Guiding Principles Section */}
      <section className="px-6 py-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            Guiding Principles
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {principles.map((principle) => (
              <Card
                key={principle.number}
                className="p-6 border-2 border-gray-900"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xl">
                      {principle.number}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {principle.title}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {principle.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* The Challenge Section */}
      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            The Problem Is Real (And It's Happening Now)
          </h2>
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p>
              Traditional talent bookings are feast or famine. One $2K shoot, then weeks of silence. Your talent sits idle between jobs. Your agency absorbs the revenue volatility. Meanwhile, your operational overhead stays constant—calendars, contracts, client coordination, payment processing.
            </p>
            <p>
              Traditional agency infrastructure was built for physical bookings. It doesn't account for AI licensing revenue streams. Agencies can't efficiently manage both traditional shoots and digital likeness deals. Talent sees inconsistent income. Agencies leave money on the table during booking gaps.
            </p>
            <p>
              The AI era created new questions: How do you manage traditional and AI bookings simultaneously? How do you scale revenue without scaling headcount? How do you ensure talent stays loyal during dry spells?
            </p>
            <p className="text-xl font-bold text-gray-900">
              Likelee solves all three.
            </p>
          </div>
        </div>
      </section>

      {/* Why Now Section */}
      <section className="px-6 py-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Why Likelee, Why Now?
          </h2>
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p>
              AI didn't create the feast-or-famine nature of talent bookings—but it created a solution. AI licensing lets the same talent work across multiple campaigns simultaneously while waiting for their next traditional booking.
            </p>
            <p>
              Traditional agency tools manage one revenue stream. They break when you add AI licensing. Booking coordination is manual. Revenue tracking is fragmented across platforms. Contract generation takes hours.
            </p>
            <p>
              Likelee is built for dual-revenue agencies—where one roster generates both traditional booking fees and recurring AI licensing income, and managing both requires integrated infrastructure, not scattered tools.
            </p>
            <p className="text-xl font-bold text-gray-900">
              We're not replacing traditional bookings. We're adding a second revenue stream that fills the gaps and compounds over time.
            </p>
          </div>
        </div>
      </section>

      {/* Our Approach Section */}
      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            How It Works: From Roster Upload to Revenue
          </h2>

          <div className="space-y-6">
            {approachSteps.map((item, index) => (
              <Card
                key={index}
                className="p-6 bg-white border-2 border-gray-200 hover:border-gray-900 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Who Uses Likelee Section */}
      <section className="px-6 py-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            Who Uses Likelee
          </h2>

          <div className="space-y-6">
            {users.map((user, index) => (
              <Card key={index} className="p-6 border-2 border-gray-900">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {user.profile}
                </h3>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {user.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How We Operate Section */}
      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            How We Operate
          </h2>

          <div className="space-y-6">
            {operations.map((operation, index) => {
              const Icon = operation.icon;
              return (
                <Card
                  key={index}
                  className="p-6 bg-white border-2 border-gray-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {operation.title}
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        {operation.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
