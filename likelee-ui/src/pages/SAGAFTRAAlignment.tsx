
import React, { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Shield, DollarSign, Lock, FileText, Users, Scale } from "lucide-react";

export default function SAGAFTRAAlignment() {
  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "SAG-AFTRA Alignment",
      "description": "How Likelee implements SAG-AFTRA AI safeguards: informed consent, fair pay, scope-locked usage, and enforceable protections for all creators.",
      "url": "https://likelee.ai/s-a-g-a-f-t-r-a-alignment",
      "about": {
        "@type": "Thing",
        "name": "SAG-AFTRA AI Guidelines Compliance",
        "description": "Likelee bakes the 2025 SAG-AFTRA Commercials Contract AI safeguards into every license"
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

  const safeguards = [
    {
      icon: FileText,
      title: "Informed consent every time",
      description: "A creator signs a clear, project-specific release before any capture, synthetization, or reuse of their face, voice, or motion.",
      color: "from-[#32C8D1] to-teal-600"
    },
    {
      icon: DollarSign,
      title: "Fair pay & residuals on autopilot",
      description: "Each replica triggers up-front compensation, ongoing residuals, and full pension/health (or equivalent) contributions—logged and paid out automatically by our royalty engine.",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: Lock,
      title: "Scope-locked usage",
      description: "Contracts spell out exactly where (TV, streaming, social, in-engine, print, etc.) and how long a replica can appear. New medium? New project? Fresh approval + payout.",
      color: "from-[#F18B6A] to-[#E07A5A]"
    },
    {
      icon: Shield,
      title: "No blanket rights or transfers",
      description: '"All-media in perpetuity" clauses are void here. Consent is non-transferable; sublicensing requires a brand-new agreement.',
      color: "from-purple-500 to-indigo-600"
    },
    {
      icon: Users,
      title: "AI-training is a separate license",
      description: "Feeding likeness data into model training is its own, bargained-for use case with distinct terms and revenue share.",
      color: "from-[#F7B750] to-yellow-600"
    },
    {
      icon: Users,
      title: "Background talent protected",
      description: "Digital stand-ins never count toward background-hiring minimums or replace on-set performers.",
      color: "from-cyan-500 to-blue-600"
    },
    {
      icon: Scale,
      title: "Enforceable safeguards",
      description: "Backed by SAG-AFTRA contracts and California law, giving creators clear recourse if terms are breached.",
      color: "from-red-500 to-pink-600"
    }
  ];

  return (
    <div className="bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-8">
            <CheckCircle2 className="w-16 h-16 mx-auto text-[#32C8D1] mb-4" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            SAG-AFTRA Alignment
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
            Likelee bakes the 2025 SAG-AFTRA Commercials Contract AI safeguards into every license we issue—and we apply the same bar to all creators on the platform (actors, models, athletes, influencers, voice).
          </p>
        </div>
      </section>

      {/* Safeguards Grid */}
      <section className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {safeguards.map((safeguard, index) => {
              const Icon = safeguard.icon;
              return (
                <Card key={index} className="p-8 bg-white border-2 border-black transition-all hover:shadow-xl group rounded-none">
                  <div className={`w-16 h-16 bg-gradient-to-br ${safeguard.color} border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{safeguard.title}</h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {safeguard.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom Line Section */}
      <section className="px-6 py-16 bg-gradient-to-r from-[#32C8D1] via-teal-500 to-cyan-600">
        <div className="max-w-5xl mx-auto">
          <Card className="p-12 bg-white border-2 border-black shadow-2xl rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 text-center">
              Bottom Line
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed text-center">
              Likelee licenses talent the way the union's AI rules intended—consent first, cash second, creator control always—and we hold every brand and campaign on the platform to that same standard.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
