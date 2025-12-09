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

  const headline = "Fishing for Something Real in the AI Era?";
  const [typedHeadline, setTypedHeadline] = useState("");
  const [typedIndex, setTypedIndex] = useState(0);

  useEffect(() => {
    if (typedIndex > headline.length) return;
    const id = setTimeout(() => {
      setTypedHeadline(headline.slice(0, typedIndex));
      setTypedIndex((i) => i + 1);
    }, 40);
    return () => clearTimeout(id);
  }, [typedIndex]);

  const phrases = ["Ready to Use", "Verified Protection", "Licensed Faces"];
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % phrases.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

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
      <section className="bg-[#32C8D1] text-white">
        <style>{`
          @keyframes blink-change { 0%, 100% { opacity: 1; } 45%, 55% { opacity: 0; } }
        `}</style>
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <div className="mx-auto text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">
            {typedHeadline}
          </div>
          <div
            className="relative mt-2 overflow-hidden"
            style={{ height: "1.5rem" }}
          >
            <div
              key={phraseIdx}
              className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-xs sm:text-sm md:text-base font-bold opacity-95"
              style={{ animation: "blink-change 180ms linear 1" }}
            >
              {phrases[phraseIdx]}
            </div>
          </div>
        </div>
      </section>

      {/* HERO: Text left, phone video right */}
      <section className="relative pt-24 lg:pt-32 pb-16 lg:pb-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Build Real Athlete Partnerships That Pay Year-Round
            </h1>
            <p className="mt-6 text-gray-600 text-lg">
              One retainer, consistent presence. Athletes earn, you win.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                onClick={() => navigate("/BrandCompany")}
                className="h-12 px-8 bg-gradient-to-r from-[#F7B750] to-[#FAD54C] text-white border-2 border-black rounded-none"
              >
                For Brands
              </Button>
              <Button
                onClick={() => navigate("/AgencySelection")}
                variant="outline"
                className="h-12 px-8 border-2 border-black rounded-none"
              >
                For Agencies
              </Button>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative w-[260px] sm:w-[300px] md:w-[340px] aspect-[9/18.8] rounded-[2.5rem] border-8 border-black shadow-2xl overflow-hidden">
              <video
                className="w-full h-full object-cover"
                src="/media/Nadege.mp4"
                autoPlay
                muted
                playsInline
                loop
              />
            </div>
          </div>
        </div>
      </section>

      {/* Arrow 1: Hero Phone to Section 2 Phone */}
      <div className="hidden lg:block relative h-32">
        <svg
          className="absolute left-1/2 -translate-x-1/2 -top-20"
          width="400"
          height="800"
          viewBox="0 0 400 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <marker
              id="arrowhead-1"
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="6"
              orient="auto"
            >
              <polygon points="0 0, 12 6, 0 12" fill="#000000" />
            </marker>
          </defs>
          <path
            d="M 280 50 Q 50 300, 120 750"
            stroke="#000000"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            markerEnd="url(#arrowhead-1)"
          />
        </svg>
      </div>

      {/* SECTION 2: Phone left, copy right with two CTAs */}
      <section className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-last lg:order-first flex justify-center">
            <div className="relative w-[240px] sm:w-[280px] md:w-[320px] aspect-[9/18.8] rounded-[2.5rem] border-8 border-black shadow-2xl overflow-hidden">
              <video
                className="w-full h-full object-cover"
                src="/media/reel2_likelee.mp4"
                autoPlay
                muted
                playsInline
                loop
              />
            </div>
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              Transform How You Work with Talent
            </h2>
            <p className="mt-4 text-gray-600">
              From months of vetting to minutes of browsing.
            </p>
          </div>
        </div>
      </section>

      {/* Arrow 2: Section 2 Phone to Section 3 Phone */}
      <div className="hidden lg:block relative h-32">
        <svg
          className="absolute left-1/2 -translate-x-1/2 -top-20"
          width="400"
          height="800"
          viewBox="0 0 400 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <marker
              id="arrowhead-2"
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="6"
              orient="auto"
            >
              <polygon points="0 0, 12 6, 0 12" fill="#000000" />
            </marker>
          </defs>
          <path
            d="M 120 50 Q 350 300, 280 750"
            stroke="#000000"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            markerEnd="url(#arrowhead-2)"
          />
        </svg>
      </div>


      {/* SECTION 3: Copy left, phone right */}
      <section className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              Don't Lose User Trust using Fake Avatars
            </h2>
            <p className="mt-4 text-gray-600">
              Real creators bring genuine belief, and your audiences feel it
              instantly.
            </p>
          </div>
          <div className="flex justify-center">
            <div className="relative w-[240px] sm:w-[280px] md:w-[320px] aspect-[9/18.8] rounded-[2.5rem] border-8 border-black shadow-2xl overflow-hidden">
              <video
                className="w-full h-full object-cover"
                src="/media/reel3_likelee.mp4"
                autoPlay
                muted
                playsInline
                loop
              />
            </div>
          </div>
        </div>
      </section>

      {/* Arrow 3: Section 3 Phone to Section 4 Phone */}
      <div className="hidden lg:block relative h-32">
        <svg
          className="absolute left-1/2 -translate-x-1/2 -top-20"
          width="400"
          height="800"
          viewBox="0 0 400 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <marker
              id="arrowhead-3"
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="6"
              orient="auto"
            >
              <polygon points="0 0, 12 6, 0 12" fill="#000000" />
            </marker>
          </defs>
          <path
            d="M 280 50 Q 50 300, 120 750"
            stroke="#000000"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            markerEnd="url(#arrowhead-3)"
          />
        </svg>
      </div>


      {/* SECTION 4: Example - Scale Catalog without Scaling Costs */}
      <section className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex justify-center">
            <div className="relative w-[240px] sm:w-[280px] md:w-[320px] aspect-[9/18.8] rounded-[2.5rem] border-8 border-black shadow-2xl overflow-hidden">
              <video
                className="w-full h-full object-cover"
                src="/media/reel4_likelee.mp4"
                autoPlay
                muted
                playsInline
                loop
              />
            </div>
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              Scale Your Catalog Without Scaling Costs
            </h2>
            <p className="mt-4 text-gray-600">
              Same influencer. Infinite product variations. Launch in hours.
            </p>
          </div>
        </div>
      </section>

      {/* Arrow 4: Section 4 Phone to Section 5 Phone */}
      <div className="hidden lg:block relative h-32">
        <svg
          className="absolute left-1/2 -translate-x-1/2 -top-20"
          width="400"
          height="800"
          viewBox="0 0 400 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <marker
              id="arrowhead-4"
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="6"
              orient="auto"
            >
              <polygon points="0 0, 12 6, 0 12" fill="#000000" />
            </marker>
          </defs>
          <path
            d="M 120 50 Q 350 300, 280 750"
            stroke="#000000"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            markerEnd="url(#arrowhead-4)"
          />
        </svg>
      </div>


      {/* SECTION 5: Example - Premium Talent (phone right) */}
      <section className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              Premium Talent with Zero Production Headaches
            </h2>
            <p className="mt-4 text-gray-600">
              Skip shoot day and access verified models from top agencies. All
              with premium results.
            </p>
          </div>
          <div className="flex justify-center">
            <div className="relative w-[240px] sm:w-[280px] md:w-[320px] aspect-[9/18.8] rounded-[2.5rem] border-8 border-black shadow-2xl overflow-hidden">
              <video
                className="w-full h-full object-cover"
                src="/media/reel5_likelee.mp4"
                autoPlay
                muted
                playsInline
                loop
              />
            </div>
          </div>
        </div>
      </section>

      {/* Arrow 5: Section 5 Phone to Section 6 Phone */}
      <div className="hidden lg:block relative h-32">
        <svg
          className="absolute left-1/2 -translate-x-1/2 -top-20"
          width="400"
          height="800"
          viewBox="0 0 400 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <marker
              id="arrowhead-5"
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="6"
              orient="auto"
            >
              <polygon points="0 0, 12 6, 0 12" fill="#000000" />
            </marker>
          </defs>
          <path
            d="M 280 50 Q 50 300, 120 750"
            stroke="#000000"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            markerEnd="url(#arrowhead-5)"
          />
        </svg>
      </div>



      {/* SECTION 6: Example - Built for Brands of All Sizes (phone left) */}
      <section className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-last lg:order-first flex justify-center">
            <div className="relative w-[240px] sm:w-[280px] md:w-[320px] aspect-[9/18.8] rounded-[2.5rem] border-8 border-black shadow-2xl overflow-hidden">
              <video
                className="w-full h-full object-cover"
                src="/media/reel6.mp4"
                autoPlay
                muted
                playsInline
                loop
              />
            </div>
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              Built for Brands of All Sizes
            </h2>
            <p className="mt-4 text-gray-600">
              From ecom startups to enterprises—build high-touch campaigns with
              verified talent for every budget.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
