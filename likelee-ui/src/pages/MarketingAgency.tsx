import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Shield, Users, Zap, CheckCircle2, TrendingUp, Clock, Globe, FileCheck, Award, Eye, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MarketingAgency() {
  const navigate = useNavigate();

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Marketing Agency Solutions",
      "description": "Scale your creative output without scaling your team. Access verified creators and AI talent on one streamlined platform.",
      "provider": {
        "@type": "Organization",
        "name": "Likelee",
        "url": "https://likelee.ai"
      },
      "serviceType": "Marketing Agency Creator Platform",
      "areaServed": "Worldwide",
      "audience": {
        "@type": "Audience",
        "audienceType": "Marketing Agencies, Creative Agencies"
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

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-12 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-gray-100 text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-none border-2 border-black">
              For Marketing Agencies
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
              Scale Your Creative Output
              <span className="block bg-gradient-to-r from-[#32C8D1] to-teal-500 bg-clip-text text-transparent">
                Without Scaling Your Team
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-700 max-w-4xl mx-auto mb-8 leading-relaxed">
              Access verified creators and AI talent. Use one streamlined platform. Get campaigns to clients faster. <span className="font-bold text-gray-900">Likelee gives agencies the infrastructure to deliver more creative—in less time, with zero legal risk.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate(createPageUrl("SalesInquiry"))}
                className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:opacity-90 text-white border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
              >
                Book a Demo
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("OrganizationSignup") + "?type=marketing_agency")}
                variant="outline"
                className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium border-2 border-black rounded-none hover:bg-gray-50"
              >
                Get Early Access
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: The Agency Problem */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              You're Managing Three Things. Likelee Is One.
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your clients want faster creative turnaround. You're juggling:
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="w-14 h-14 bg-gradient-to-br from-[#32C8D1] to-teal-500 rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Talent Sourcing</h3>
              <p className="text-gray-700 leading-relaxed">
                Emails, DMs, outdated rosters, no verified licenses
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Campaign Creation</h3>
              <p className="text-gray-700 leading-relaxed">
                Coordinating briefs, managing revisions, handling approvals
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="w-14 h-14 bg-gradient-to-br from-[#32C8D1] to-teal-500 rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Legal Compliance</h3>
              <p className="text-gray-700 leading-relaxed">
                Consent forms, usage rights, DMCA protection, SAG-AFTRA alignment
              </p>
            </Card>
          </div>

          <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none">
            <p className="text-xl text-gray-900 mb-4">
              <span className="font-bold">Result:</span> You're spending 40% of your time on logistics. Your team is burned out. Your margins are shrinking.
            </p>
            <p className="text-2xl font-bold text-[#32C8D1]">
              Likelee changes that.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 3: Your Gateway to AI-Powered Campaigns */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Your Gateway to AI-Powered Campaigns
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Clients Want AI. You Don't Need to Hire an AI Team to Deliver It.
            </p>
          </div>

          <Card className="p-8 md:p-12 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-black rounded-none mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">The Reality</h3>
            <div className="space-y-4 text-lg text-gray-700">
              <p>Your clients are asking: <span className="font-bold">"Can we do this faster with AI?"</span></p>
              <p>Your team is asking: <span className="font-bold">"How do we build AI capabilities?"</span></p>
              <p>Your leadership is asking: <span className="font-bold">"Is this a risk?"</span></p>
            </div>
            <p className="text-2xl font-bold text-[#32C8D1] mt-8">
              Likelee removes all three concerns.
            </p>
          </Card>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">You Don't Need to Build.</h3>
              <p className="text-gray-700 leading-relaxed">
                Verified creators + AI tools + compliance infrastructure. It's already built. You just use it.
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Your Team Doesn't Need Retraining.</h3>
              <p className="text-gray-700 leading-relaxed">
                Same workflow as traditional campaigns. Submit brief. Get deliverables. Deliver to client. Your team learns it in 10 minutes.
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Your Clients Don't Have to Worry.</h3>
              <p className="text-gray-700 leading-relaxed">
                Real verified consent. SAG-AFTRA compliance. Usage tracking. Your clients get the speed of AI with the safety of human verification.
              </p>
            </Card>
          </div>

          <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">What You Can Now Offer</h3>
            <div className="space-y-4 text-lg text-gray-700">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <p><span className="font-bold">Rapid production:</span> 3–5 day turnaround instead of 2–3 weeks</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <p><span className="font-bold">Scaled creative:</span> Generate 10 variations of one campaign in parallel</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <p><span className="font-bold">Verified AI faces:</span> Real people licensed their likeness (not deepfakes)</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <p><span className="font-bold">Hybrid content:</span> Mix verified creators + AI talent for maximum flexibility</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <p><span className="font-bold">Global localization:</span> Same talent, multiple languages/regions automatically</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 bg-gradient-to-r from-[#32C8D1] to-teal-500 border-2 border-black rounded-none text-center mt-8">
            <p className="text-xl text-white font-semibold">
              <span className="font-bold">The Bottom Line:</span> You transition into AI media delivery without hiring engineers, retraining your team, or building infrastructure. Likelee handles that. You handle your clients.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 4: The Three Things Likelee Does For You */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              The Three Things Likelee Does For You
            </h2>
          </div>

          <div className="space-y-12">
            {/* 1. Verified Creator Access */}
            <Card className="p-8 md:p-12 bg-white border-2 border-black rounded-none">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">VERIFIED CREATOR ACCESS (License-Ready Faces)</h3>
              </div>
              <p className="text-xl text-gray-700 mb-6">
                Stop hunting for talent. Browse a marketplace of verified creators who've already licensed their likenesses for commercial use.
              </p>
              <div className="mb-6">
                <h4 className="text-xl font-bold text-gray-900 mb-4">What You Get:</h4>
                <div className="space-y-3 text-lg text-gray-700">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                    <p>Real people (influencers, athletes, actors, models) with verified identities</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                    <p>Portfolio visible (see past work before booking)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                    <p>Clearance built-in (no "do we have rights?" questions)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                    <p>One-click licensing (smart contracts, auto-generated, SAG-AFTRA aligned)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                    <p>Repeatable (license the same face across multiple client campaigns)</p>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-black rounded-none">
                <p className="text-lg text-gray-900">
                  <span className="font-bold">Why It Matters:</span> Your creative team spends 2 hours hunting talent and 3 hours on compliance. Likelee cuts that to 15 minutes.
                </p>
              </div>
            </Card>

            {/* 2. Streamlined Campaign Workflow */}
            <Card className="p-8 md:p-12 bg-white border-2 border-black rounded-none">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 border-2 border-black flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">2</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">STREAMLINED CAMPAIGN WORKFLOW (Fast Turnaround)</h3>
              </div>
              <p className="text-xl text-gray-700 mb-6">
                Post a brief. Get deliverables back. Done.
              </p>
              <div className="mb-6">
                <h4 className="text-xl font-bold text-gray-900 mb-4">The Workflow:</h4>
                <div className="space-y-3 text-lg text-gray-700">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                    <p>Upload brand assets, script, or reference clips</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                    <p>Select verified creators or AI talent from marketplace</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                    <p>Submit brief (scope, usage rights, deadline)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                    <p>Creators/AI talent delivers within 3–5 days</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                    <p>Client approves → you deliver</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                    <p>Royalties and usage tracked automatically</p>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-black rounded-none">
                <p className="text-lg text-gray-900">
                  <span className="font-bold">Why It Matters:</span> No back-and-forth emails. No "can you change this?" delays. Clear scope = predictable timeline = happy clients.
                </p>
              </div>
            </Card>

            {/* 3. Exposure to Brands */}
            <Card className="p-8 md:p-12 bg-white border-2 border-black rounded-none">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">3</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">EXPOSURE TO BRANDS (Direct Channel)</h3>
              </div>
              <p className="text-xl text-gray-700 mb-6">
                Your agency gets visibility on Likelee when brands search for service providers.
              </p>
              <div className="mb-6">
                <h4 className="text-xl font-bold text-gray-900 mb-4">What You Get:</h4>
                <div className="space-y-3 text-lg text-gray-700">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                    <p>Brands see your agency when they search for "agencies specializing in [niche]"</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                    <p>Direct inbound from brands looking for campaign support</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                    <p>Ability to pitch verified creator campaigns as a service</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                    <p>White-label option (resell Likelee capabilities as your own studio)</p>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-black rounded-none">
                <p className="text-lg text-gray-900">
                  <span className="font-bold">Why It Matters:</span> New revenue channel. Inbound pipeline. Less cold calling.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 5: How Likelee Works For Agencies */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How Likelee Works For Agencies
            </h2>
            <p className="text-xl text-gray-600">From Chaos to System</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">You Bring the Client Relationship</h3>
              <p className="text-gray-700 leading-relaxed">
                Your account manager takes the brief, understands the brand, sets expectations.
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Likelee Brings the Infrastructure</h3>
              <p className="text-gray-700 leading-relaxed">
                Verified creators, streamlined approvals, licensing, compliance, royalty tracking.
              </p>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">You Deliver to Your Client</h3>
              <p className="text-gray-700 leading-relaxed">
                Finished campaign with verified usage rights, watermarks, and license documentation.
              </p>
            </Card>
          </div>

          <Card className="p-8 bg-gradient-to-r from-[#32C8D1] to-teal-500 border-2 border-black rounded-none text-center mt-12">
            <p className="text-xl text-white font-semibold">
              Everyone wins. You own the relationship. Likelee handles the complexity.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 6: Your Workflow */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Your Workflow
            </h2>
            <p className="text-xl text-gray-600">Three Steps to Campaign Done</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mb-6">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Client Submits Brief</h3>
              <p className="text-gray-700 leading-relaxed">
                Your client describes what they need: "5 Instagram Reels featuring [niche] creators" or "30-second commercial with athlete testimonial."
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 border-2 border-black flex items-center justify-center mb-6">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">You Find Talent on Likelee</h3>
              <p className="text-gray-700 leading-relaxed">
                Search verified creators by niche, follower count, past work quality. Or use AI Talent for rapid production. Select 5 creators. Submit briefs. They respond within 24 hours.
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mb-6">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">You Deliver to Client</h3>
              <p className="text-gray-700 leading-relaxed">
                Approved deliverables come back with full licensing embedded. You hand it off. Royalties are tracked automatically. Done.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 7: Real Agency Wins */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Real Agency Wins
            </h2>
            <p className="text-xl text-gray-600">What Agencies Are Actually Getting</p>
          </div>

          <div className="space-y-8">
            <Card className="p-8 md:p-12 bg-white border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Boutique Social Agency</h3>
              <div className="space-y-4 text-lg text-gray-700">
                <p><span className="font-bold">Used to:</span> Hunt for micro-influencers via Instagram, negotiate contracts, manage payments</p>
                <p><span className="font-bold">Now:</span> Search Likelee marketplace, book 10 creators in 30 minutes, get deliverables in 3 days</p>
                <p className="text-[#32C8D1] font-bold"><span className="text-gray-900">Result:</span> Delivered campaign 2 weeks faster. Client renewed contract.</p>
              </div>
            </Card>

            <Card className="p-8 md:p-12 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Mid-Sized Digital Agency</h3>
              <div className="space-y-4 text-lg text-gray-700">
                <p><span className="font-bold">Used to:</span> Manage separate vendors for creators, AI video, compliance, royalty tracking</p>
                <p><span className="font-bold">Now:</span> Everything on one platform. License verified faces. Generate AI content. Approve. Deliver.</p>
                <p className="text-[#32C8D1] font-bold"><span className="text-gray-900">Result:</span> Cut production time by 40%. Handling 3x more campaigns with same team.</p>
              </div>
            </Card>

            <Card className="p-8 md:p-12 bg-white border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Full-Service Studio</h3>
              <div className="space-y-4 text-lg text-gray-700">
                <p><span className="font-bold">Used to:</span> Build in-house AI tools, hire editors, manage creator relationships manually</p>
                <p><span className="font-bold">Now:</span> White-label Likelee Studio. Resell as "Agency Creative Studio" to clients</p>
                <p className="text-[#32C8D1] font-bold"><span className="text-gray-900">Result:</span> New revenue stream. 25% margin on every campaign.</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 8: The Compliance Angle */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              The Compliance Angle (You Don't Have to Worry)
            </h2>
            <p className="text-xl text-gray-600">Your Clients Sleep Well. So Do You.</p>
          </div>

          <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Every creator on Likelee:</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-gray-900 mb-1">Verified identity</p>
                  <p className="text-gray-700">Government ID matched</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-gray-900 mb-1">Verified likeness rights</p>
                  <p className="text-gray-700">Confirmed they own their image</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-gray-900 mb-1">Licensed consent</p>
                  <p className="text-gray-700">Smart contracts, pre-cleared</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-gray-900 mb-1">SAG-AFTRA compliant</p>
                  <p className="text-gray-700">All agreements aligned</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-gray-900 mb-1">DMCA protected</p>
                  <p className="text-gray-700">Watermarks + automated takedowns</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-gray-900 mb-1">Tracked usage</p>
                  <p className="text-gray-700">Every campaign logged, searchable</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-8 bg-gradient-to-r from-[#32C8D1] to-teal-500 border-2 border-black rounded-none text-center">
            <p className="text-xl text-white font-semibold">
              <span className="font-bold">Result:</span> Zero legal gray areas. Zero "did we get permission?" anxiety. Your clients can confidently run campaigns.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 11: What You Get */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              What You Get
            </h2>
            <p className="text-xl text-gray-600">The Platform Handles Everything So You Can Focus on Your Client</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <h3 className="font-bold text-gray-900">Verified Creator Marketplace</h3>
              </div>
              <p className="text-gray-700 text-sm">License-ready faces. No hunting. No compliance nightmares.</p>
            </Card>

            <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <h3 className="font-bold text-gray-900">Streamlined Campaign Workflow</h3>
              </div>
              <p className="text-gray-700 text-sm">Brief → Deliverables → Client approval → Done. 3–5 day turnaround.</p>
            </Card>

            <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <h3 className="font-bold text-gray-900">One Dashboard</h3>
              </div>
              <p className="text-gray-700 text-sm">Browse talent, submit briefs, approve work, track usage, manage royalties—all centralized.</p>
            </Card>

            <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <h3 className="font-bold text-gray-900">Direct Brand Exposure</h3>
              </div>
              <p className="text-gray-700 text-sm">Brands find you on Likelee. Inbound pipeline for your agency.</p>
            </Card>

            <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <h3 className="font-bold text-gray-900">Escrow-Protected Payments</h3>
              </div>
              <p className="text-gray-700 text-sm">Creators paid when brands approve. You don't manage invoicing.</p>
            </Card>

            <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <h3 className="font-bold text-gray-900">Full Compliance</h3>
              </div>
              <p className="text-gray-700 text-sm">SAG-AFTRA aligned contracts, DMCA protection, usage tracking. Your clients are covered.</p>
            </Card>

            <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <h3 className="font-bold text-gray-900">White-Label Option</h3>
              </div>
              <p className="text-gray-700 text-sm">Resell Likelee Studio capabilities as your own creative studio.</p>
            </Card>

            <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <h3 className="font-bold text-gray-900">AI Media Transition Made Easy</h3>
              </div>
              <p className="text-gray-700 text-sm">Offer AI-powered campaigns without hiring engineers or retraining your team.</p>
            </Card>

            <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <h3 className="font-bold text-gray-900">Priority Support</h3>
              </div>
              <p className="text-gray-700 text-sm">Dedicated partner support. We help you succeed.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 12: How to Get Started */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How to Get Started
            </h2>
            <p className="text-xl text-gray-600">Ready to Scale?</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mb-6 mx-auto">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Demo</h3>
              <p className="text-gray-700 leading-relaxed text-center">
                See the platform live. See verified creators, test the workflow.
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 border-2 border-black flex items-center justify-center mb-6 mx-auto">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Pilot</h3>
              <p className="text-gray-700 leading-relaxed text-center">
                Onboard 1–2 clients. Run 1–2 campaigns. See the time savings.
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mb-6 mx-auto">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Scale</h3>
              <p className="text-gray-700 leading-relaxed text-center">
                Roll out across your client roster. Hire Likelee as your infrastructure partner.
              </p>
            </Card>
          </div>

          <Card className="p-8 bg-gradient-to-r from-[#32C8D1] to-teal-500 border-2 border-black rounded-none text-center">
            <p className="text-xl text-white font-semibold">
              We help agencies manage this transition. Onboarding support included.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 13: FAQ */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                How does agency pricing work?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Monthly subscription starts at $149 (Starter) or $449 (Pro). You pay for access to the marketplace, studio tools, and compliance infrastructure. Metered add-ons for extra usage.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Do I need to manage contracts with creators?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                No. Likelee handles contracts. You select creators, submit briefs, creators approve. Likelee manages licensing, payments, compliance.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can I white-label this for my clients?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. Enterprise plan includes white-label studio portal. Resell as your own creative studio.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What if a client dispute comes up?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Likelee mediates. We have a dispute resolution process. Most are resolved within 48 hours.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can I integrate Likelee with my existing tools?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Enterprise plan includes API access. Integrate with your project management, billing, or CRM.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                How do I charge my clients?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                You set your own pricing. Typical markups: 25–50% on Likelee subscription costs + creator licensing fees. Agencies manage client billing separately.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What kind of support do I get?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Starter: Email support. Pro: 48h priority support. Enterprise: Dedicated CSM + phone support.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Section 14: CTA */}
      <section className="px-6 py-24 bg-gradient-to-r from-[#32C8D1] to-teal-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Stop Juggling. Start Scaling.
          </h2>
          <p className="text-lg md:text-xl text-cyan-100 mb-10">
            Your clients want faster creative. Your team is burned out. Likelee fixes both.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-white hover:bg-gray-100 text-[#32C8D1] border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
            >
              Book a Demo
            </Button>
            <Button 
              onClick={() => navigate(createPageUrl("OrganizationSignup") + "?type=marketing_agency")}
              variant="outline"
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-transparent hover:bg-white/10 text-white border-2 border-white rounded-none"
            >
              Get Early Access
            </Button>
          </div>
          <p className="text-cyan-100 mt-6 text-sm">
            See it in action. 30 minutes. See how 3 campaigns could work.
          </p>
        </div>
      </section>
    </div>
  );
}