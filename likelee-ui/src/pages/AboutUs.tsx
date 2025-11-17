import React, { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Shield, FileCheck, Eye, DollarSign, Lock, Users, CheckCircle2 } from "lucide-react";

export default function AboutUs() {
  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "About Likelee",
      "description": "In the age of AI, human identity should be an asset, not a liability. Likelee builds the infrastructure for creators to own, control, and profit from their digital likeness.",
      "url": "https://likelee.ai/about-us",
      "mainEntity": {
        "@type": "Organization",
        "name": "Likelee",
        "description": "Infrastructure for creators, athletes, and talent to own, control, and profit from their digital likeness",
        "foundingDate": "2024",
        "mission": "Creating a new economy where consent is law, every use is tracked, and creators earn forever—not just once"
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const principles = [
    {
      number: "1",
      title: "Consent is Everything",
      description: "If you don't explicitly approve it, it doesn't happen."
    },
    {
      number: "2",
      title: "Compensation is Automatic",
      description: "No chasing payments. Earnings route instantly."
    },
    {
      number: "3",
      title: "Transparency Over Secrecy",
      description: "You see every use, every time, in real-time."
    },
    {
      number: "4",
      title: "Human First, Technology Second",
      description: "We build what solves today's problems, not tomorrow's."
    }
  ];

  const approachSteps = [
    {
      step: "Step 1",
      title: "Identity Verification",
      description: "You record a 60-second guided video. We verify your identity against your government ID and confirm facial motion (liveness check). This stops imposters before they enter the system."
    },
    {
      step: "Step 2",
      title: "Avatar Creation",
      description: "Your cameo is converted into a secure, encrypted digital double. You get a ready-to-license asset. Your raw biometric data stays private."
    },
    {
      step: "Step 3",
      title: "You Set the Rules",
      description: "Define scope (social ads? TV commercials? Films?), territory (US only? Global?), term (1 month? 1 year?), and price. No legal jargon. Plain language."
    },
    {
      step: "Step 4",
      title: "Brands Request. You Approve.",
      description: "Studios and brands browse your profile, submit their brief, and wait for your approval. Reject or accept in one click."
    },
    {
      step: "Step 5",
      title: "You Earn. Automatically.",
      description: "Every use is logged on a shared ledger you can see in real-time. Payments route instantly. No invoicing. No spreadsheet hell."
    },
    {
      step: "Step 6",
      title: "You Stay in Control",
      description: "Rights expire automatically. Brands can't renew without asking. You can revoke, pause, or adjust terms anytime."
    }
  ];

  const users = [
    {
      profile: "Creators & Athletes",
      description: "Earn recurring income from their likeness while keeping total control. One dashboard for all approvals and earnings."
    },
    {
      profile: "Talent Agencies & Unions",
      description: "Scale NIL and digital-replica deals across entire rosters. Bulk onboarding, unified compliance tracking, instant payouts."
    },
    {
      profile: "Studios & Brands",
      description: "Access verified, cleared avatars for ads, games, and campaigns—without months of legal negotiation or consent risk."
    }
  ];

  const operations = [
    {
      icon: Shield,
      title: "Verification First",
      description: "Every creator passes identity checks before their avatar goes live. Bad actors don't get a platform."
    },
    {
      icon: FileCheck,
      title: "Contracts You Actually Understand",
      description: "No legal mumbo-jumbo. Plain language agreements with automatic expiry dates and sunset clauses baked in."
    },
    {
      icon: Eye,
      title: "Shared Ledger, Full Transparency",
      description: "Both you and the brand see the same real-time record of every use, every payment, every expiration date."
    },
    {
      icon: Lock,
      title: "Security by Design",
      description: "Biometric files encrypted at rest. No third-party data sales. No scraping. Your data is yours."
    },
    {
      icon: Users,
      title: "Built With Users, Not For Users",
      description: "We only release features when creators, agencies, and studios confirm real-world need. No feature bloat."
    }
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Mission Section */}
      <section className="px-6 pt-12 pb-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Mission</h2>
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p className="text-xl font-semibold text-gray-900">
              In the age of AI, human identity should be an asset, not a liability.
            </p>
            <p>
              Likelee builds the infrastructure for creators, athletes, and talent to own, control, and profit from their digital likeness. We're creating a new economy where consent is law, every use is tracked, and creators earn forever—not just once.
            </p>
          </div>
        </div>
      </section>

      {/* Guiding Principles Section */}
      <section className="px-6 py-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">Guiding Principles</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {principles.map((principle) => (
              <Card key={principle.number} className="p-6 border-2 border-gray-900">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xl">{principle.number}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{principle.title}</h3>
                    <p className="text-gray-700 leading-relaxed">{principle.description}</p>
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
          <h2 className="text-4xl font-bold text-gray-900 mb-6">The Problem Is Real (And It's Happening Now)</h2>
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p>
              Your face can be replicated in seconds. Your voice can be synthesized. Your likeness can be used in ads, films, games—anywhere—without you knowing. And you won't see a dime.
            </p>
            <p>
              Traditional contracts were built for on-set work. They don't account for perpetual, software-driven reuse. Talent reps can't police every brand activation or data scrape. Creators rarely see the value that synthetic versions of themselves generate.
            </p>
            <p>
              The AI era created a new problem: How do you prove consent at scale? How do you track infinite reuses? How do you ensure talent gets paid?
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
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Why Likelee, Why Now?</h2>
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p>
              AI didn't create the problem of people's likenesses being used without consent—but it made it infinitely scalable. Deepfakes, synthetic media, digital twins: these aren't future threats. They're here.
            </p>
            <p>
              Traditional licensing works for one-time uses. It breaks for perpetual, software-driven reuse. Consent tracking is manual. Payments are sporadic. Nobody wins.
            </p>
            <p>
              Likelee is built for the AI era—where one likeness can generate infinite value, and tracking that value requires transparent infrastructure, not spreadsheets.
            </p>
            <p className="text-xl font-bold text-gray-900">
              We're not trying to stop AI. We're ensuring that when it uses your face, your voice, your likeness—you know about it, you approve it, and you get paid for it.
            </p>
          </div>
        </div>
      </section>

      {/* Our Approach Section */}
      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">How It Works: From Capture to Earnings</h2>
          
          <div className="space-y-6">
            {approachSteps.map((item, index) => (
              <Card key={index} className="p-6 bg-white border-2 border-gray-200 hover:border-gray-900 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-700 leading-relaxed">{item.description}</p>
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
          <h2 className="text-4xl font-bold text-gray-900 mb-8">Who Uses Likelee</h2>
          
          <div className="space-y-6">
            {users.map((user, index) => (
              <Card key={index} className="p-6 border-2 border-gray-900">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{user.profile}</h3>
                <p className="text-lg text-gray-700 leading-relaxed">{user.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How We Operate Section */}
      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">How We Operate</h2>
          
          <div className="space-y-6">
            {operations.map((operation, index) => {
              const Icon = operation.icon;
              return (
                <Card key={index} className="p-6 bg-white border-2 border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{operation.title}</h3>
                      <p className="text-gray-700 leading-relaxed">{operation.description}</p>
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