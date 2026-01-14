import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Shield,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
} from "lucide-react";

export default function BrandsForYou() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      {/* Hero Section */}
      <section className="px-6 pt-24 pb-16 border-b-2 border-black">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8">
            Built for
            <span className="block bg-gradient-to-r from-[#F7B750] to-[#FAD54C] bg-clip-text text-transparent">
              Modern Brands
            </span>
          </h1>
          <p className="text-2xl text-gray-600 font-light">
            Launch campaigns that connect. Fast, verified, and transparently
            licensed.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Section 1 */}
          <div className="bg-white p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Why Likelee Exists
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              The old model for sourcing talent is broken. You have to navigate
              agencies, sign complex contracts, coordinate shoots, and hope the
              face you licensed is actually available. It's slow, expensive, and
              unpredictable.
            </p>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              AI-generated content is fast—but it lacks the humanity and
              authenticity audiences crave. Fully synthetic creators might be
              cheap, but they don't build trust. They don't connect.
            </p>
            <p className="text-2xl text-[#F7B750] font-bold">
              Likelee gives you both: real faces, powered by AI speed.
            </p>
          </div>

          {/* What We Offer */}
          <div className="bg-gradient-to-br from-[#F7B750]/10 to-amber-50 p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              What Likelee Offers
            </h2>

            <div className="grid gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#F7B750] border-2 border-black flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Verified Human Creators
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Access a marketplace of real people who have licensed their
                    faces for commercial use. Every creator is
                    identity-verified, consent-confirmed, and ready to appear in
                    your campaigns.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#FAD54C] border-2 border-black flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    AI-Powered Production
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Pair licensed faces with Likelee's AI video generation
                    tools. Create ads, social content, and campaigns in
                    hours—not weeks. No shoots, no travel, no delays.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-500 border-2 border-black flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Transparent Licensing
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Every asset comes with clear usage rights—region, duration,
                    channels. No hidden fees. No legal gray areas. Just simple,
                    brand-safe licensing that protects both you and the creator.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#F7B750] border-2 border-black flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Performance Tracking
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Track every impression, every view, and every license usage
                    in real-time. Know exactly how your content performs and how
                    much you're paying per asset.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              How It Works
            </h2>

            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-[#F7B750] border-2 border-black flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Browse Verified Creators
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Search by demographics, style, niche, or follower count.
                    Every profile includes licensing terms, rates, and usage
                    permissions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-[#FAD54C] border-2 border-black flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Submit Your Brief
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Upload your script, select channels and regions, and request
                    approval. Creators review and green-light requests in
                    real-time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-orange-500 border-2 border-black flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Generate Content with AI
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Use Likelee Studio to generate videos, ads, or social
                    content featuring licensed faces. AI handles production—you
                    handle the strategy.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-[#F7B750] border-2 border-black flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">
                  4
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Launch & Track
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Deploy your campaign and track performance in real-time. All
                    assets are watermarked and license-verified for compliance
                    and security.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Why Now */}
          <div className="bg-gradient-to-br from-[#F7B750]/10 to-amber-50 p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Why Now?
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              AI-generated video is no longer experimental—it's
              production-ready. But audiences still crave authenticity. They
              want to see real people, real faces, real stories.
            </p>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              Likelee bridges that gap. You get AI speed and scale, but with the
              trust and connection that only real faces can deliver.
            </p>
            <p className="text-2xl text-[#F7B750] font-bold">
              The future of content isn't fully synthetic or fully traditional.
              It's both—and Likelee makes it possible.
            </p>
          </div>

          {/* Pricing Teaser */}
          <div className="bg-white p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Transparent Pricing, No Surprises
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              Choose from flat-rate licenses, CPM-based campaigns, or time-boxed
              usage agreements. Every option is designed for clarity and brand
              safety.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 border-2 border-black rounded-none">
                <DollarSign className="w-10 h-10 text-[#F7B750] mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Flat Slot
                </h3>
                <p className="text-gray-700">Fixed 7-, 15-, or 30-sec asset</p>
                <p className="text-3xl font-bold text-gray-900 mt-4">$350</p>
                <p className="text-sm text-gray-600">per 15 seconds</p>
              </Card>

              <Card className="p-6 border-2 border-black rounded-none bg-gradient-to-br from-[#F7B750]/10 to-amber-50">
                <TrendingUp className="w-10 h-10 text-[#F7B750] mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  CPM License
                </h3>
                <p className="text-gray-700">Performance-driven campaigns</p>
                <p className="text-3xl font-bold text-gray-900 mt-4">$12</p>
                <p className="text-sm text-gray-600">CPM</p>
              </Card>

              <Card className="p-6 border-2 border-black rounded-none">
                <Clock className="w-10 h-10 text-[#F7B750] mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Time-Boxed
                </h3>
                <p className="text-gray-700">TV, OOH, or paid social</p>
                <p className="text-3xl font-bold text-gray-900 mt-4">$600</p>
                <p className="text-sm text-gray-600">/ 30-day region</p>
              </Card>
            </div>
          </div>

          {/* Final CTA */}
          <div className="bg-gradient-to-br from-[#F7B750] to-[#FAD54C] p-8 md:p-12 border-2 border-black shadow-lg rounded-none text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to transform your content strategy?
            </h2>
            <p className="text-xl text-amber-100 mb-8">
              Join brands already using Likelee to create authentic, AI-powered
              campaigns.
            </p>
            <Button
              onClick={() => navigate(createPageUrl("GetAccess"))}
              className="h-16 px-12 text-lg font-medium bg-white hover:bg-gray-100 text-[#F7B750] border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
            >
              Get Started
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
