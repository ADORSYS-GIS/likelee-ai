
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Zap, Shield, DollarSign, Globe, FileCheck, Clock, TrendingUp, Users, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BrandsStudios() {
  const navigate = useNavigate();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  const messages = [
    "Verified Creators.",
    "Licensed Assets.",
    "Fast Turnaround."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        setIsFlipping(false);
      }, 300); // Duration of flipOut animation
    }, 3000); // Total interval time

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 min-h-screen">
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
      <section className="relative px-6 pt-16 pb-12 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 mb-6">
              <span 
                className={`block bg-gradient-to-r from-[#F7B750] to-[#FAD54C] bg-clip-text text-transparent ${isFlipping ? 'flip-out' : 'flip-in'}`}
                style={{ minHeight: '1.2em' }}
              >
                {messages[currentMessageIndex]}
              </span>
              <span className="block mt-2">
                Book AI cameos from real creators and launch your next campaign in hours.
              </span>
            </h1>
            <div className="flex gap-4 justify-center mt-10">
              <Button 
                onClick={() => navigate(createPageUrl("GetAccess"))}
                className="h-14 px-10 text-base font-medium bg-[#F7B750] hover:bg-[#E6A640] text-white border-2 border-black shadow-lg transition-all hover:shadow-xl hover:scale-105 rounded-none"
              >
                Browse Creator Marketplace
              </Button>
              <Button 
                onClick={() => navigate(createPageUrl("SalesInquiry"))}
                variant="outline" 
                className="h-14 px-10 text-base font-medium border-2 border-black rounded-none"
              >
                Request Enterprise Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-[#F7B750] to-[#FAD54C] rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Verified Creators</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Access real, verified creators who have licensed their likeness for commercial use — no legal gray areas.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FAD54C] to-[#F7B750] rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Diverse Talent Pool</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Choose from a wide range of creators across various niches, demographics, and languages.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Performance Insights</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Gain access to detailed analytics and performance data to optimize your campaigns.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-[#D06A4A] rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Rapid Creative Scaling</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Generate high-quality, on-brand content at an unprecedented pace to meet demand.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Brands Trust Likelee */}
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Brands & Studios Trust Likelee
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-[#F7B750] rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Speed to Asset</h3>
              <p className="text-gray-600 leading-relaxed">
                Generate ready-to-run creative in &lt; 24 h—no travel, no reshoots.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-amber-500 rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Brand-Safe Licensing</h3>
              <p className="text-gray-600 leading-relaxed">
                Every cameo is pre-cleared with territory, duration, and usage scope baked into a smart contract.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-orange-500 rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Transparent Pricing</h3>
              <p className="text-gray-600 leading-relaxed">
                Choose flat per-slot, CPM, or 30-day license—no hidden fees.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-[#FAD54C] rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Global Scale</h3>
              <p className="text-gray-600 leading-relaxed">
                Localize the same talent into multiple languages or aspect ratios automatically.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-[#F7B750] rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <FileCheck className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Legal & Compliance</h3>
              <p className="text-gray-600 leading-relaxed">
                Watermarked assets, automated takedowns, GDPR & SAG-AFTRA-aligned agreements.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Average turnaround: 12 hours from brief to asset
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center border-2 border-black p-8 bg-white">
              <div className="w-24 h-24 bg-gradient-to-br from-[#F7B750] to-[#E6A640] border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-5xl font-bold text-white">1</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Search & Filter</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Narrow by follower count, niche, language, or price.
              </p>
            </div>

            <div className="text-center border-2 border-black p-8 bg-white">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-500 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-5xl font-bold text-white">2</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Submit Brief</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Paste a script (20s max), pick channels & regions, and set go-live dates.
              </p>
            </div>

            <div className="text-center border-2 border-black p-8 bg-white">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-[#D06A4A] border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-5xl font-bold text-white">3</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Creator Approval</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Talent reviews and green-lights the request in one click.
              </p>
            </div>

            <div className="text-center border-2 border-black p-8 bg-white">
              <div className="w-24 h-24 bg-gradient-to-br from-[#FAD54C] to-[#F7B750] border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-5xl font-bold text-white">4</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Receive Asset + License</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Download watermark-embedded video/image with legally binding license PDF.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Subscribe to Likelee */}
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Subscribe to Likelee for Brands & Studios
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get verified access to our marketplace of real creators and AI artists.
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-16">
            <p className="text-lg text-gray-700 leading-relaxed text-center mb-8">
              Plans unlock different levels of access — from browsing verified profiles to launching full-scale campaigns.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 bg-white border-2 border-black rounded-none hover:shadow-xl transition-all">
                <h3 className="text-xl font-bold text-gray-900 mb-3">License Directly from Creators</h3>
                <p className="text-gray-600 leading-relaxed">
                  Each creator sets their own likeness rate. Pay only for the faces you choose to feature — whether for an ad, short film, or campaign.
                </p>
              </Card>

              <Card className="p-6 bg-white border-2 border-black rounded-none hover:shadow-xl transition-all">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Generate Content with AI Artists</h3>
                <p className="text-gray-600 leading-relaxed">
                  Pair your licensed talent with verified AI creators to produce assets instantly through Likelee Studio.
                </p>
              </Card>

              <Card className="p-6 bg-white border-2 border-black rounded-none hover:shadow-xl transition-all md:col-span-2">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Track Usage & Royalties</h3>
                <p className="text-gray-600 leading-relaxed">
                  Every file carries embedded consent and usage rights, visible to both you and the creator.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Tiers */}
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Subscription Tiers
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter */}
            <Card className="p-8 border-2 border-black rounded-none bg-white hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
              <p className="text-gray-600 mb-6">For small brands & boutique studios</p>
              
              <div className="mb-8">
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-bold text-gray-900">$98</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Access all verified creators</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">20 active campaign slots / month</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Likeness payments made directly to creators</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Studio tools for AI generation</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">10% platform fee on direct creator payments</span>
                </div>
              </div>

              <Button
                onClick={() => navigate(createPageUrl("GetAccess") + "?plan=starter")}
                className="w-full h-12 bg-gradient-to-r from-[#F7B750] to-[#FAD54C] hover:opacity-90 text-white border-2 border-black rounded-none"
              >
                Get Started
              </Button>
            </Card>

            {/* Pro Studio */}
            <Card className="p-8 border-2 border-black rounded-none bg-gradient-to-br from-amber-50 to-yellow-50 hover:shadow-xl transition-all relative">
              <div className="absolute top-0 right-0 bg-gradient-to-br from-[#F7B750] to-[#FAD54C] text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                POPULAR
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro Studio</h3>
              <p className="text-gray-600 mb-6">For scaling agencies & production teams</p>
              
              <div className="mb-8">
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-bold text-gray-900">$299</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Unlimited marketplace access</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Invite your own talent for protection tracking</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Team analytics & client dashboards</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Priority AI creator matching</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">10% platform fee on direct creator payments</span>
                </div>
              </div>

              <Button
                onClick={() => navigate(createPageUrl("GetAccess") + "?plan=pro")}
                className="w-full h-12 bg-gradient-to-r from-[#F7B750] to-[#FAD54C] hover:opacity-90 text-white border-2 border-black rounded-none"
              >
                Get Started
              </Button>
            </Card>

            {/* Enterprise */}
            <Card className="p-8 border-2 border-black rounded-none bg-white hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-gray-600 mb-6">For global studios & networks</p>
              
              <div className="mb-8">
                <div className="flex items-baseline mb-2">
                  <span className="text-2xl font-bold text-gray-900">Custom pricing</span>
                </div>
                <p className="text-sm text-gray-600">Contact Sales</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Custom rights integrations via API</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Bulk licensing infrastructure</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Custom revenue-share agreements</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">5% platform fee on direct creator payments</span>
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

      {/* Hire Elite AI Creators */}
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Hire Elite AI Creators
            </h2>
            <p className="text-xl text-gray-600">
              Video & Campaign Artists
            </p>
          </div>

          <div className="grid gap-6">
            <Card className="p-8 bg-white border-2 border-black rounded-none hover:shadow-xl transition-all">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Concept-to-Final Video</h3>
                </div>
                <div>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Storyboarding, voice-over, motion design, music, mastering—done in-house by AI specialists.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none hover:shadow-xl transition-all">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Platform-Ready Variations</h3>
                </div>
                <div>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Instant 16:9, 9:16, 1:1 cuts plus language and subtitle packs—ready for TikTok, Reels, CTV, OOH.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none hover:shadow-xl transition-all">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Custom Brand Assets</h3>
                </div>
                <div>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Logos, product renders, dynamic supers, and color-grade matched to your guidelines.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none hover:shadow-xl transition-all">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">License-Locked Files</h3>
                </div>
                <div>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Each output ships with the correct usage term (region, duration, channel) embedded in its metadata.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none hover:shadow-xl transition-all">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Performance Reporting <sup className="text-sm text-gray-500">Growth + tiers</sup>
                  </h3>
                </div>
                <div>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    View reach, engagement, and lift data alongside your cameo analytics—one dashboard.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Campaign */}
      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Featured Campaign
            </h2>
          </div>

          <Card className="p-8 bg-white/80 backdrop-blur-sm border-2 border-black shadow-2xl rounded-none">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">GlowSkin Cosmetics</h3>
                <p className="text-gray-600">Creator: @NinaSkye · 230K followers</p>
              </div>
              <Badge className="bg-green-100 text-green-700 border-2 border-black rounded-none px-4 py-2">
                Live Campaign
              </Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-2">DELIVERABLE</h4>
                <p className="text-gray-900">15-sec TikTok ad, US + Canada, 30-day run</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-2">TIME TO ASSET</h4>
                <p className="text-gray-900 font-bold">9 hours</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 border-2 border-black rounded-none">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Results (First Week)</h4>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-3xl font-bold text-gray-900">1.2M</p>
                  <p className="text-sm text-gray-600">Views</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">3.4%</p>
                  <p className="text-sm text-gray-600">CTR</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">$0.07</p>
                  <p className="text-sm text-gray-600">eCPM</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Pricing & Licensing */}
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Pricing & Licensing
            </h2>
            <p className="text-xl text-gray-600">
              Custom enterprise bundles available → contact sales
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 border-2 border-black rounded-none bg-white hover:shadow-2xl transition-all">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Flat Slot</h3>
                <p className="text-gray-600 mb-4">Fixed 7-, 15-, or 30-sec asset</p>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">$350</span>
                  <span className="text-gray-600 ml-2">per 15 seconds</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">Best for: Single-use campaigns</p>
            </Card>

            <Card className="p-8 border-2 border-black rounded-none bg-gradient-to-br from-[#F7B750]/10 to-[#FAD54C]/10 hover:shadow-2xl transition-all">
              <div className="mb-6">
                <Badge className="mb-4 bg-[#F7B750] text-white border-2 border-black rounded-none">
                  Popular
                </Badge>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">CPM License</h3>
                <p className="text-gray-600 mb-4">Performance-driven campaigns</p>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">$12</span>
                  <span className="text-gray-600 ml-2">CPM</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">Paid post-impression</p>
            </Card>

            <Card className="p-8 border-2 border-black rounded-none bg-white hover:shadow-2xl transition-all">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Time-Boxed</h3>
                <p className="text-gray-600 mb-4">TV, OOH, or paid social</p>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">$600</span>
                  <span className="text-gray-600 ml-2">/ 30-day region</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">Best for: Broadcast & OOH</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Compliance & Trust */}
      <section className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Compliance & Trust
            </h2>
          </div>

          <div className="space-y-6">
            <Card className="p-6 border-2 border-black rounded-none bg-white flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Cryptographic Watermarks</h4>
                <p className="text-gray-600">Each asset is tied to its license with embedded verification.</p>
              </div>
            </Card>

            <Card className="p-6 border-2 border-black rounded-none bg-white flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Automated DMCA Protection</h4>
                <p className="text-gray-600">Web scanning issues takedowns for unlicensed copies automatically.</p>
              </div>
            </Card>

            <Card className="p-6 border-2 border-black rounded-none bg-white flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-gray-900 mb-2">SAG-AFTRA Compliant</h4>
                <p className="text-gray-600">All agreements mapped to influencer-code guidelines.</p>
              </div>
            </Card>

            <Card className="p-6 border-2 border-black rounded-none bg-white flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-gray-900 mb-2">GDPR/CCPA Compliant</h4>
                <p className="text-gray-600">No PII passed to third parties; full data sovereignty.</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                How long does creator approval take?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Median approval time is 4 hours; urgent requests can flag "fast-track."
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can we request revisions?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                One free text revision is included per brief before final render.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What formats do you deliver?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                MP4 (H.264), MOV (ProRes), JPG/PNG, and ProRes 422 HQ for broadcast.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                How are view counts verified?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Optional Likelee pixel or your own ad-platform reporting—both log back to the license.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What if we exceed the licensed timeframe?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                The asset self-disables via watermark overlay; you'll receive renewal options automatically.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 bg-[#F7B750]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Launch your first AI cameo today
          </h2>
          <p className="text-xl text-amber-100 mb-10">
            Deliver fresh creative without booking a shoot.
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={() => navigate(createPageUrl("GetAccess"))}
              className="h-16 px-12 text-lg font-medium bg-white hover:bg-gray-100 text-[#F7B750] border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
            >
              Browse Marketplace
            </Button>
            <Button 
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              variant="outline"
              className="h-16 px-12 text-lg font-medium bg-transparent hover:bg-white/10 text-white border-2 border-white rounded-none"
            >
              Talk to Sales
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
