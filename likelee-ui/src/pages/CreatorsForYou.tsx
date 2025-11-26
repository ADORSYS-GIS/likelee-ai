import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Zap,
  DollarSign,
  Users,
  Shield,
  BarChart3,
  GraduationCap,
} from "lucide-react";

export default function CreatorsForYou() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-rose-50">
      {/* Hero Section */}
      <section className="px-6 pt-24 pb-16 border-b-2 border-black">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            For the New Creative Professional:
            <span className="block bg-gradient-to-r from-[#F18B6A] to-pink-500 bg-clip-text text-transparent">
              The AI Artist.
            </span>
          </h1>
          <p className="text-2xl text-gray-600 font-light">
            A Platform Built for Your Vision, Your Career, and Your Wallet.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Why We Built This */}
          <div className="bg-white p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Why We Built This
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              You're not just a prompt engineer. You are a director, a
              storyteller, a visual pioneer. The tools for AI creation are
              evolving at lightspeed, but the professional infrastructure has
              been left behind. We saw a gap between groundbreaking artistry and
              sustainable careers.
            </p>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              We built Likelee to bridge that gap. This isn't another tool; it's
              your professional ecosystem. A place where your craft is
              respected, your collaborations are seamless, and your compensation
              is guaranteed.
            </p>
          </div>

          {/* The Likelee Commitment */}
          <div className="bg-gradient-to-br from-[#F18B6A]/10 to-pink-50 p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              The Likelee Commitment
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed mb-8">
              We make six promises that put you, the creator, in control.
            </p>
          </div>

          {/* Six Promises Grid */}
          <div className="grid gap-8">
            <Card className="p-8 bg-white border-2 border-black hover:shadow-xl transition-all rounded-none">
              <div className="flex gap-6">
                <div className="w-14 h-14 bg-gradient-to-br from-[#F18B6A] to-pink-500 border-2 border-black flex items-center justify-center flex-shrink-0">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Your Vision is the Engine.
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Models and tools will change. Your ideas are the constant.
                    Likelee is tool-agnostic, allowing you to focus on the
                    story, not the software.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black hover:shadow-xl transition-all rounded-none">
              <div className="flex gap-6">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 border-2 border-black flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Get Paid, Not Played.
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    No more chasing invoices. We guarantee upfront fees, clear
                    licensing terms, and automated royalties. Your financial
                    dashboard is as transparent as your creative one.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black hover:shadow-xl transition-all rounded-none">
              <div className="flex gap-6">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-500 border-2 border-black flex items-center justify-center flex-shrink-0">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Direct, Don't Negotiate.
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Access a library of verified, pre-cleared talent. Contracts
                    and releases are baked in, so you can spend your time on
                    set—not on paperwork.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black hover:shadow-xl transition-all rounded-none">
              <div className="flex gap-6">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 border-2 border-black flex items-center justify-center flex-shrink-0">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Your Virtual Studio.
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    This is your hub for professional collaboration. Post briefs
                    for projects, find trusted co-creators, and manage shared
                    assets, all from your dashboard.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black hover:shadow-xl transition-all rounded-none">
              <div className="flex gap-6">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 border-2 border-black flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Own Your Analytics.
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Track every view, every license, and every payout in
                    real-time. We provide the data you need to understand your
                    work's impact and value.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black hover:shadow-xl transition-all rounded-none">
              <div className="flex gap-6">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 border-2 border-black flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Master Your Craft.
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Grow alongside the industry's best. Access exclusive
                    workshops, deep-dive technique breakdowns, and peer project
                    reviews to sharpen your skills while you build your
                    portfolio.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Final Section */}
          <div className="bg-white p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Your Stage is Waiting.
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed">
              Stop juggling platforms and navigating legal gray areas. Start
              building a body of work for brands that value true creative
              partnership.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 bg-gradient-to-br from-[#F18B6A] via-pink-500 to-rose-500 border-t-2 border-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to join the platform built for you?
          </h2>
          <p className="text-xl text-orange-100 mb-10">
            Start building your professional AI creative career today.
          </p>
          <Button
            onClick={() => navigate(createPageUrl("CreatorSignup"))}
            className="h-16 px-12 text-lg font-medium bg-white hover:bg-gray-100 text-[#F18B6A] border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
          >
            Join
          </Button>
        </div>
      </section>
    </div>
  );
}
