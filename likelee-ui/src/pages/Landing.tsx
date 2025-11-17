import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, CheckCircle2, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const navigate = useNavigate();

  const createPageUrl = (path) => {
    return `/${path
      .toLowerCase()
      .replace(/([A-Z])/g, "-$1")
      .replace(/^-/, "")}`;
  };

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Likelee",
      url: "https://likelee.ai",
      description:
        "Join a growing network where real people, AI creative talent, and businesses turn creative vision into earnings—one AI-powered project at a time.",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://likelee.ai/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
      publisher: {
        "@type": "Organization",
        name: "Likelee",
        logo: {
          "@type": "ImageObject",
          url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eaaf29851_Screenshot2025-10-12at31742PM.png",
        },
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
    <div className="relative">
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .bounce-arrow { animation: bounce 2s ease-in-out infinite; }
      `}</style>

      {/* Hero Section */}
      <section className="relative pt-24 pb-24 lg:pt-32 lg:pb-32 overflow-hidden border-b-2 border-black bg-gradient-to-b from-sky-100 to-cyan-50 min-h-screen">
        <div className="relative z-10 max-w-7xl mx-auto text-center pb-32 px-6">
          <h1 className="text-lg md:text-2xl lg:text-3xl font-normal text-gray-900 mb-12 leading-relaxed max-w-4xl mx-auto">
            Join a growing network where real people, AI creative talent, and
            businesses turn creative vision into earnings—one AI-powered project
            at a time.
          </h1>

          {/* SAG-AFTRA Badge */}
          <div className="flex justify-center mb-12">
            <button
              onClick={() => navigate(createPageUrl("SAGAFTRAAlignment"))}
              className="group inline-flex items-center gap-3 bg-white border border-gray-300 px-6 py-3 hover:border-gray-900 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 text-gray-700" />
              <div className="text-left">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aligned With
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  SAG-AFTRA Standards
                </div>
              </div>
            </button>
          </div>

          {/* Arrow Down with SVG Branching */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              {/* Bouncing Arrow */}
              <div className="flex justify-center bounce-arrow">
                <ArrowDown className="w-8 h-8 text-gray-900" strokeWidth={3} />
              </div>

              {/* SVG Branch Lines */}
              <svg
                className="absolute top-8 left-1/2 -translate-x-1/2"
                width="600"
                height="120"
                viewBox="0 0 600 120"
                style={{ pointerEvents: "none" }}
              >
                {/* Main vertical line */}
                <line
                  x1="300"
                  y1="0"
                  x2="300"
                  y2="40"
                  stroke="#111"
                  strokeWidth="3"
                />

                {/* Left branch to Creators */}
                <path
                  d="M 300 40 Q 280 60, 150 80"
                  stroke="#32C8D1"
                  strokeWidth="3"
                  fill="none"
                />

                {/* Center line to AI Artists */}
                <line
                  x1="300"
                  y1="40"
                  x2="300"
                  y2="80"
                  stroke="#F18B6A"
                  strokeWidth="3"
                  fill="none"
                />

                {/* Right branch to Business */}
                <path
                  d="M 300 40 Q 320 60, 450 80"
                  stroke="#F7B750"
                  strokeWidth="3"
                  fill="none"
                />
              </svg>
            </div>
          </div>

          {/* Three Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-32">
            {/* Creators Button */}
            <Button
              onClick={() => navigate(createPageUrl("Faces"))}
              className="h-20 px-8 text-2xl font-bold bg-gradient-to-br from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black shadow-xl transition-all hover:scale-105 rounded-none"
            >
              Creators
            </Button>

            {/* AI Artists Button */}
            <Button
              onClick={() => navigate(createPageUrl("AICreators"))}
              className="h-20 px-8 text-2xl font-bold bg-gradient-to-br from-[#F18B6A] to-[#E07A5A] hover:from-[#E07A5A] hover:to-[#D06A4A] text-white border-2 border-black shadow-xl transition-all hover:scale-105 rounded-none"
            >
              AI Artists
            </Button>

            {/* Business Button */}
            <Button
              onClick={() => navigate(createPageUrl("ForBusiness"))}
              className="h-20 px-8 text-2xl font-bold bg-gradient-to-br from-[#F7B750] to-[#FAD54C] hover:from-[#E6A640] hover:to-[#F7B750] text-white border-2 border-black shadow-xl transition-all hover:scale-105 rounded-none"
            >
              Business
            </Button>
          </div>
        </div>

        {/* Ocean Wave Effect - Clean waves only, no sea life */}
        <div
          className="absolute bottom-0 left-0 right-0 w-full h-[400px] md:h-[500px] overflow-hidden z-0"
          style={{ pointerEvents: "none" }}
        >
          {/* Ocean Waves - Back Layer (Gentle Parabola) */}
          <svg
            className="absolute bottom-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 400"
            preserveAspectRatio="none"
          >
            <path
              fill="#32C8D1"
              fillOpacity="0.3"
              d="M0,260 Q360,240 720,260 T1440,260 L1440,400 L0,400 Z"
            >
              <animate
                attributeName="d"
                dur="10s"
                repeatCount="indefinite"
                values="
                  M0,260 Q360,240 720,260 T1440,260 L1440,400 L0,400 Z;
                  M0,260 Q360,280 720,260 T1440,260 L1440,400 L0,400 Z;
                  M0,260 Q360,240 720,260 T1440,260 L1440,400 L0,400 Z"
              />
            </path>
          </svg>

          {/* Ocean Waves - Front Layer (Gentle Parabola) */}
          <svg
            className="absolute bottom-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 400"
            preserveAspectRatio="none"
          >
            <path
              fill="#32C8D1"
              fillOpacity="0.5"
              d="M0,280 Q360,260 720,280 T1440,280 L1440,400 L0,400 Z"
            >
              <animate
                attributeName="d"
                dur="8s"
                repeatCount="indefinite"
                values="
                  M0,280 Q360,260 720,280 T1440,280 L1440,400 L0,400 Z;
                  M0,280 Q360,300 720,280 T1440,280 L1440,400 L0,400 Z;
                  M0,280 Q360,260 720,280 T1440,280 L1440,400 L0,400 Z"
              />
            </path>
          </svg>
        </div>
      </section>
    </div>
  );
}
