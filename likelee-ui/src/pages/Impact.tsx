import React, { useEffect } from "react";
import { Card } from "@/components/ui/card";
import CinematicGlobe from "@/components/CinematicGlobe";

export default function Impact() {
  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Environmental Impact - Sustainability Commitment",
      description:
        "Our commitment to responsible AI infrastructure and environmental accountability. Transparency, collaboration, and measurable progress.",
      url: "https://likelee.ai/impact",
      about: {
        "@type": "Thing",
        name: "Environmental Sustainability",
        description:
          "Likelee's approach to protecting and empowering human identity while maintaining environmental responsibility",
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
    <div>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        
        .stars-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, rgba(15, 35, 65, 1) 0%, rgba(5, 15, 30, 1) 100%);
        }
        
        .stars-bg::before,
        .stars-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(2px 2px at 20px 30px, white, transparent),
            radial-gradient(2px 2px at 60px 70px, white, transparent),
            radial-gradient(1px 1px at 50px 50px, white, transparent),
            radial-gradient(1px 1px at 130px 80px, white, transparent),
            radial-gradient(2px 2px at 90px 10px, white, transparent),
            radial-gradient(1px 1px at 150px 120px, white, transparent),
            radial-gradient(2px 2px at 200px 90px, white, transparent),
            radial-gradient(1px 1px at 250px 40px, white, transparent),
            radial-gradient(1px 1px at 300px 100px, white, transparent),
            radial-gradient(2px 2px at 350px 60px, white, transparent);
          background-size: 400px 400px;
          background-repeat: repeat;
          animation: twinkle 3s ease-in-out infinite;
        }
        
        .stars-bg::after {
          background-image: 
            radial-gradient(1px 1px at 100px 150px, white, transparent),
            radial-gradient(2px 2px at 180px 20px, white, transparent),
            radial-gradient(1px 1px at 220px 180px, white, transparent),
            radial-gradient(1px 1px at 280px 130px, white, transparent),
            radial-gradient(2px 2px at 320px 170px, white, transparent),
            radial-gradient(1px 1px at 40px 110px, white, transparent),
            radial-gradient(1px 1px at 140px 190px, white, transparent),
            radial-gradient(2px 2px at 270px 30px, white, transparent),
            radial-gradient(1px 1px at 330px 140px, white, transparent),
            radial-gradient(1px 1px at 370px 80px, white, transparent);
          background-size: 400px 400px;
          animation: twinkle 4s ease-in-out infinite reverse;
        }
      `}</style>

      {/* Hero Section with Globe */}
      <section className="relative px-6 pt-24 pb-16 overflow-hidden">
        <div className="stars-bg"></div>

        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
            Our
            <span className="block bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Environmental Commitment
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto leading-relaxed mb-12">
            At Likelee, creativity and technology are inseparable — and both
            rely on resources that carry real impact. Every render, export, and
            campaign we power runs on energy. Recognizing that footprint is part
            of our responsibility as a platform that serves creators and studios
            worldwide.
          </p>
        </div>

        {/* Cinematic Globe */}
        <div className="relative z-10 max-w-5xl mx-auto mb-8">
          <CinematicGlobe />
        </div>
      </section>

      {/* Why This Matters */}
      <section
        className="relative px-6 pt-12 pb-16"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(15, 35, 65, 1) 0%, rgba(5, 15, 30, 1) 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Why This Matters
          </h2>
          <p className="text-xl text-gray-200 leading-relaxed">
            Producing digital work is not impact-free. Whether it's an AI model
            running inference, a video render, or data stored in the cloud, each
            creative output has an environmental cost. For us, acknowledging
            that connection isn't a marketing statement — it's a baseline for
            operating with integrity in a rapidly expanding industry.
          </p>
        </div>
      </section>

      {/* Our Approach */}
      <section
        className="relative px-6 pt-12 pb-16"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(15, 35, 65, 1) 0%, rgba(5, 15, 30, 1) 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Our Approach
            </h2>
          </div>

          <div className="grid gap-8">
            <Card className="p-8 border-2 border-emerald-400 hover:shadow-xl transition-all rounded-none bg-white/10 backdrop-blur-sm">
              <h3 className="text-2xl font-bold text-white mb-4">
                1. Responsible Infrastructure
              </h3>
              <p className="text-gray-200 leading-relaxed text-lg">
                We prioritize cloud providers and partners who publish
                transparent sustainability data and measurable progress reports.
                These relationships are reviewed regularly as standards and
                technologies evolve.
              </p>
            </Card>

            <Card className="p-8 border-2 border-emerald-400 hover:shadow-xl transition-all rounded-none bg-white/10 backdrop-blur-sm">
              <h3 className="text-2xl font-bold text-white mb-4">
                2. Transparency by Default
              </h3>
              <p className="text-gray-200 leading-relaxed text-lg">
                We're developing in-product cues that help users understand when
                their settings or generation methods consume more resources.
                These are designed to inform, not restrict, giving artists and
                studios control over their choices.
              </p>
            </Card>

            <Card className="p-8 border-2 border-emerald-400 hover:shadow-xl transition-all rounded-none bg-white/10 backdrop-blur-sm">
              <h3 className="text-2xl font-bold text-white mb-4">
                3. Collaboration and Accountability
              </h3>
              <p className="text-gray-200 leading-relaxed text-lg">
                We maintain an open dialogue with creators, sustainability
                experts, and technologists through ongoing discussions and
                quarterly review sessions. These inform our infrastructure
                roadmap and our product updates.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* What We Stand By */}
      <section
        className="relative px-6 pt-12 pb-16"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(15, 35, 65, 1) 0%, rgba(5, 15, 30, 1) 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            What We Stand By
          </h2>
          <p className="text-xl text-gray-200 leading-relaxed">
            We won't hide the realities of energy use behind vague
            sustainability claims or superficial pledges. Our goal is to be
            specific, measurable, and open to correction as the field evolves.
            Real progress depends on clarity, not slogans.
          </p>
        </div>
      </section>

      {/* Your Role */}
      <section
        className="relative px-6 pt-12 pb-16"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(15, 35, 65, 1) 0%, rgba(5, 15, 30, 1) 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Your Role
          </h2>
          <p className="text-xl text-gray-200 leading-relaxed">
            When you upload, license, or produce through Likelee, you're
            participating in a shared system built on traceability and
            accountability. Simple actions — such as batching exports or using
            optimized render settings — contribute meaningfully to efficiency at
            scale. The tools are available; the choices remain yours.
          </p>
        </div>
      </section>

      {/* Looking Forward */}
      <section
        className="relative px-6 pt-12 pb-16"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(15, 35, 65, 1) 0%, rgba(5, 15, 30, 1) 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Looking Forward
          </h2>
          <p className="text-xl text-gray-200 leading-relaxed mb-8">
            Sustainability is not a fixed goal but an ongoing process. As AI
            generation becomes more advanced and accessible, our commitment is
            to maintain balance — to innovate without neglecting the impact of
            that innovation. We'll continue refining Likelee's infrastructure
            and reporting practices to ensure creative progress and
            environmental responsibility can coexist.
          </p>
          <p className="text-2xl text-emerald-400 font-bold mb-6">
            We invite you to collaborate, critique, and help us improve.
          </p>
          <p className="text-lg text-gray-300 leading-relaxed">
            Reach out with ideas, concerns, or partnership opportunities at{" "}
            <a
              href="mailto:operations@likelee.ai"
              className="text-emerald-400 hover:text-emerald-300 underline"
            >
              operations@likelee.ai
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
