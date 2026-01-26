import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Users,
  Zap,
  CheckCircle2,
  FileCheck,
  BarChart3,
  Film,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProductionStudio() {
  const navigate = useNavigate();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  const messages = [
    "License verified likeness.",
    "Streamline production.",
    "Bring a human touch to your AI-driven creative projects.",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        setIsFlipping(false);
      }, 300);
    }, 2000);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 min-h-screen">
      <style>{`
        @keyframes flipOut {
          0% {
            transform: perspective(400px) rotateX(0deg);
            opacity: 1;
          }
          100% {
            transform: perspective(400px) rotateX(90deg);
            opacity: 0;
          }
        }
        
        @keyframes flipIn {
          0% {
            transform: perspective(400px) rotateX(-90deg);
            opacity: 0;
          }
          100% {
            transform: perspective(400px) rotateX(0deg);
            opacity: 1;
          }
        }
        
        .flip-out {
          animation: flipOut 0.3s ease-in forwards;
        }
        
        .flip-in {
          animation: flipIn 0.3s ease-out forwards;
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative px-6 pt-12 pb-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-8 bg-slate-100 text-slate-700 hover:bg-slate-100 px-4 py-2 rounded-none border-2 border-black">
              For Production Houses & Studios
            </Badge>
            <div
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 max-w-4xl mx-auto mb-6 leading-tight"
              style={{ minHeight: "7rem" }}
            >
              <span
                className={`block bg-gradient-to-r from-slate-700 to-gray-800 bg-clip-text text-transparent ${isFlipping ? "flip-out" : "flip-in"}`}
              >
                {messages[currentMessageIndex]}
              </span>
            </div>
            <p className="text-2xl md:text-3xl text-gray-600 max-w-4xl mx-auto mb-8 leading-relaxed">
              Connect with influencers and AI creators for your full production
              needs.
            </p>
            <Button
              onClick={() =>
                navigate(`${createPageUrl("ComingSoon")}?feature=Brand%20signup`)
              }
              className="h-14 px-10 text-base font-medium bg-gradient-to-r from-slate-700 to-gray-800 hover:from-slate-800 hover:to-gray-900 text-white border-2 border-black shadow-lg transition-all hover:shadow-xl hover:scale-105 rounded-none"
            >
              Request Studio Access
            </Button>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Value Proposition
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-700 rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Verified Talent Library
              </h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Access thousands of real, licensed faces cleared for
                advertising, film, and AI generation.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-gray-600 to-gray-700 rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Embedded Consent & Rights
              </h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Every likeness carries built-in metadata outlining region,
                duration, and usage permissions.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-zinc-600 to-zinc-700 rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <FileCheck className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Credit & Attribution Tools
              </h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Credit each licensed face in-frame, in metadata, or in credits —
                ensuring ethical compliance and recognition.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-gray-800 rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Creator Collaboration
              </h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Work with AI artists and creative technologists directly through
                Likelee Studio to bring concepts to life.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Plans & Pricing */}
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Plans & Pricing
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Studio Access */}
            <Card className="p-8 border-2 border-black rounded-none bg-white hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Studio Access
              </h3>
              <p className="text-gray-600 mb-6">
                For small creative teams or boutique production houses
              </p>

              <div className="mb-8">
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-bold text-gray-900">$199</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    Unlimited marketplace access (Faces + AI Talent)
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    Standard licensing for digital & social use
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    Direct payment to creators per usage
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    Track usage & license duration via dashboard
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    AI video/image generation via Likelee Studio
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">3 team seats</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Email support</span>
                </div>
              </div>

              <Button
                onClick={() =>
                  navigate(
                    createPageUrl("OrganizationSignup") +
                      "?type=production_studio&plan=studio",
                  )
                }
                className="w-full h-12 bg-gradient-to-r from-slate-700 to-gray-800 hover:opacity-90 text-white border-2 border-black rounded-none"
              >
                Get Started
              </Button>
            </Card>

            {/* Creative Studio */}
            <Card className="p-8 border-2 border-black rounded-none bg-gradient-to-br from-slate-50 to-gray-50 hover:shadow-xl transition-all relative">
              <div className="absolute top-0 right-0 bg-gradient-to-br from-slate-700 to-gray-800 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                POPULAR
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Creative Studio
              </h3>
              <p className="text-gray-600 mb-6">
                For growing production companies and creative collectives
              </p>

              <div className="mb-8">
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-bold text-gray-900">$449</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    Unlimited marketplace access (Faces + AI Talent)
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    Commercial licensing for broadcast, OOH, and paid campaigns
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    Private asset library for in-house talent or clients
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    Credits & attribution tracking for creative works
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    Analytics dashboard for campaigns & viewership data
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    Invite AI talent & editors for collaboration
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">10 team seats</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Priority support</span>
                </div>
              </div>

              <Button
                onClick={() =>
                  navigate(
                    createPageUrl("OrganizationSignup") +
                      "?type=production_studio&plan=creative",
                  )
                }
                className="w-full h-12 bg-gradient-to-r from-slate-700 to-gray-800 hover:opacity-90 text-white border-2 border-black rounded-none"
              >
                Upgrade to Creative Studio
              </Button>
            </Card>

            {/* Enterprise Production */}
            <Card className="p-8 border-2 border-black rounded-none bg-white hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Enterprise Production
              </h3>
              <p className="text-gray-600 mb-6">
                For global studios, agencies, and large-scale content pipelines
              </p>

              <div className="mb-8">
                <div className="flex items-baseline mb-2">
                  <span className="text-2xl font-bold text-gray-900">
                    Custom Pricing
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    Full API integration for rights & metadata management
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    Territory-based usage frameworks
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    Bulk license negotiation for recurring productions
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    Custom royalty splits between talent and client
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    White-label Likelee environment for in-studio use
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">
                    Dedicated account, legal, and compliance support
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Unlimited team seats</span>
                </div>
              </div>

              <Button
                onClick={() => navigate(createPageUrl("SalesInquiry"))}
                variant="outline"
                className="w-full h-12 border-2 border-black rounded-none"
              >
                Contact Sales
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Tagline Section */}
      <section className="px-6 py-16 bg-gradient-to-r from-slate-700 via-gray-700 to-zinc-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Every Face Has a Story — License It.
          </h2>
          <p className="text-xl text-slate-200 mb-4">
            Likelee helps studios create responsibly by bridging the gap between
            creative freedom and human authenticity.
          </p>
          <p className="text-2xl text-white font-semibold">
            Verified faces. Transparent rights. Real recognition.
          </p>
          <div className="flex gap-4 justify-center mt-10">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-16 px-12 text-lg font-medium bg-white hover:bg-gray-100 text-slate-700 border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
            >
              Book a Demo
            </Button>
            <Button
              onClick={() =>
                navigate(
                  createPageUrl("OrganizationSignup") +
                    "?type=production_studio",
                )
              }
              variant="outline"
              className="h-16 px-12 text-lg font-medium bg-transparent hover:bg-white/10 text-white border-2 border-white rounded-none"
            >
              Request Studio Access
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
