import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const navigate = useNavigate();

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
    <div className="bg-white">
      <section className="bg-[#32C8D1] text-white">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
            Stop Leaving Money on the Table Between Bookings
          </h2>
        </div>
      </section>

      <section className="pt-20 pb-16 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
              #1 AI-Native Talent
              <br />
              Management Platform
            </h1>
            <p className="mt-6 text-gray-600 text-base md:text-lg max-w-lg">
              Built for agencies managing both traditional bookings and AI
              licensing revenue.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                onClick={() => navigate("/BrandCompany")}
                className="h-12 px-10 bg-[#F7B750] hover:bg-[#F7B750]/90 text-white border-2 border-black rounded-none shadow-[4px_4px_0px_rgba(0,0,0,1)]"
              >
                For Brands
              </Button>
              <Button
                onClick={() => navigate("/AgencySelection")}
                variant="outline"
                className="h-12 px-10 bg-white hover:bg-gray-50 text-gray-900 border-2 border-black rounded-none shadow-[4px_4px_0px_rgba(0,0,0,1)]"
              >
                For Agencies
              </Button>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative w-[270px] sm:w-[310px] md:w-[350px] aspect-[9/18.8] rounded-[2.7rem] border-[8px] border-black shadow-[0_20px_40px_rgba(0,0,0,0.15)] overflow-hidden bg-black">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20" />
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

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-last lg:order-first flex justify-center lg:justify-start">
            <div className="relative w-[270px] sm:w-[310px] md:w-[350px] aspect-[9/18.8] rounded-[2.7rem] border-[8px] border-black shadow-[0_20px_40px_rgba(0,0,0,0.15)] overflow-hidden bg-black">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20" />
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

          <div className="max-w-xl">
            <h2 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Scale Your Roster
              <br />
              Without Scaling
              <br />
              Headcount
            </h2>
            <p className="mt-6 text-lg text-gray-600">
              Same talent. Simultaneous AI campaigns. Exponential revenue
              growth.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border-2 border-black p-8 min-h-[180px]">
              <h3 className="text-xl font-extrabold text-gray-900 leading-snug">
                Turn Booking Gaps Into
                <br />
                Predictable Monthly
                <br />
                Income
              </h3>
              <p className="mt-5 text-gray-600 text-base leading-relaxed">
                Traditional shoots plus AI licensing. Your talent earns while
                waiting for their next gig.
              </p>
            </div>
            <div className="border-2 border-black p-8 min-h-[180px]">
              <h3 className="text-xl font-extrabold text-gray-900 leading-snug">
                AI-Powered Operations
                <br />
                with Agency-Grade Control
              </h3>
              <p className="mt-5 text-gray-600 text-base leading-relaxed">
                Skip manual scheduling and access intelligent booking
                automation. All with complete contractual oversight.
              </p>
            </div>
            <div className="border-2 border-black p-8 min-h-[180px]">
              <h3 className="text-xl font-extrabold text-gray-900 leading-snug">
                Built for Agencies of All
                <br />
                Sizes
              </h3>
              <p className="mt-5 text-gray-600 text-base leading-relaxed">
                From boutique talent shops to enterprise rosters—manage
                traditional bookings and AI licensing in one platform built for
                every scale.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-xl">
            <h2 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Don&apos;t Waste Your Roster
              <br />
              Between Bookings
            </h2>
            <p className="mt-6 text-lg text-gray-600">
              AI licensing keeps talent earning consistently, and agencies feel
              the compounding revenue instantly.
            </p>
            <div className="mt-8">
              <Button
                onClick={() => navigate("/Login")}
                className="h-12 px-10 bg-[#F7B750] hover:bg-[#F7B750]/90 text-white border-2 border-black rounded-none shadow-[4px_4px_0px_rgba(0,0,0,1)]"
              >
                Get Started
              </Button>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative w-[270px] sm:w-[310px] md:w-[350px] aspect-[9/18.8] rounded-[2.7rem] border-[8px] border-black shadow-[0_20px_40px_rgba(0,0,0,0.15)] overflow-hidden bg-black">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20" />
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
    </div>
  );
}
