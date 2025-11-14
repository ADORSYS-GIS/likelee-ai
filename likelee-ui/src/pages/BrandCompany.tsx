import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Zap, Shield, DollarSign, Globe, FileCheck, Clock, TrendingUp, Users, CheckCircle2, Star, Award, Eye, UserCheck, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BrandCompany() {
  const navigate = useNavigate();

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Brand & Company Campaign Solutions",
      "description": "Launch verified talent campaigns. Project-based. Transparent pricing. No hidden costs. Access verified creators and AI filmmakers.",
      "provider": {
        "@type": "Organization",
        "name": "Likelee",
        "url": "https://likelee.ai"
      },
      "serviceType": "Brand Marketing & Creator Licensing",
      "areaServed": "Worldwide",
      "audience": {
        "@type": "Audience",
        "audienceType": "Brands, Companies, Marketing Teams"
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
              For Brands & Companies
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
              Launch Verified Talent Campaigns
              <span className="block bg-gradient-to-r from-[#F7B750] to-[#FAD54C] bg-clip-text text-transparent">
                Project-Based. Transparent Pricing. No Hidden Costs.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-700 max-w-4xl mx-auto mb-8 leading-relaxed">
              Access a marketplace of verified creators and AI filmmakers. Post a project brief. Get deliverables back. <span className="font-bold text-gray-900">Clear scope, clear pricing, clear results.</span> No hourly rates. No surprise invoices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate(createPageUrl("OrganizationSignup") + "?type=brand_company")}
                className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-gradient-to-r from-[#F7B750] to-[#FAD54C] hover:opacity-90 text-white border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
              >
                Browse Marketplace
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("SalesInquiry"))}
                variant="outline"
                className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium border-2 border-black rounded-none hover:bg-gray-50"
              >
                Schedule Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: What You Get */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              One Platform. All Verified Talent. One Price.
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              No more juggling agencies, getting surprised by invoices, or waiting weeks for creative assets.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="flex items-center gap-3 mb-4">
                <UserCheck className="w-8 h-8 text-[#F7B750]" />
                <h3 className="text-2xl font-bold text-gray-900">Verified Creators</h3>
              </div>
              <p className="text-gray-700 leading-relaxed text-lg">
                Real people who've licensed their likeness for commercial use. Portfolio-verified. Track record visible.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-8 h-8 text-[#FAD54C]" />
                <h3 className="text-2xl font-bold text-gray-900">AI Filmmakers</h3>
              </div>
              <p className="text-gray-700 leading-relaxed text-lg">
                Professional AI creators specializing in commercials, campaigns, trailers, and branded content. See their past work.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="flex items-center gap-3 mb-4">
                <FileCheck className="w-8 h-8 text-[#F7B750]" />
                <h3 className="text-2xl font-bold text-gray-900">Clear Project Scope</h3>
              </div>
              <p className="text-gray-700 leading-relaxed text-lg">
                Every project has defined deliverables, timeline, and price. No scope creep. No "wait, can we change this?"
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-8 h-8 text-[#FAD54C]" />
                <h3 className="text-2xl font-bold text-gray-900">Transparent Pricing</h3>
              </div>
              <p className="text-gray-700 leading-relaxed text-lg">
                You know exactly what you're paying before you post the brief. Project-based, not hourly.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 2: How Brands Work */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Work How You Want. Self-Serve or Agency-Managed.
            </h2>
            <p className="text-xl text-gray-600">You have options. Use Likelee directly, or bring in a partner.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="p-8 bg-gradient-to-br from-[#F7B750]/10 to-[#FAD54C]/10 border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Option 1: Direct Hiring (Self-Serve)</h3>
              <p className="text-gray-700 leading-relaxed text-lg">
                Browse verified creators and AI filmmakers. Post your brief. Manage projects yourself. Fast, transparent, full control.
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Option 2: Invite Your Marketing Agency</h3>
              <p className="text-gray-700 leading-relaxed text-lg">
                Have an agency already? Invite them to manage your Likelee projects. They handle talent selection, briefing, approvals. You stay in the loop. One platform for everything.
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Option 3: Use a Likelee Partner Agency</h3>
              <p className="text-gray-700 leading-relaxed text-lg">
                Prefer hands-off? Browse agencies on Likelee who specialize in your industry. They source talent, manage production, deliver results. You oversee and approve.
              </p>
            </Card>
          </div>

          <Card className="p-8 bg-gradient-to-r from-[#F7B750] to-[#FAD54C] border-2 border-black rounded-none text-center">
            <p className="text-xl text-white font-semibold">
              <span className="font-bold">The Likelee Difference:</span> Whether you hire directly or use an agency, all projects run on the same transparent platform. Same escrow payment protection. Same compliance. Same speed. No hidden markups.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 3: Why Brands Choose Likelee */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Brands Choose Likelee
            </h2>
            <p className="text-xl text-gray-600">Speed, Quality, Compliance. Plus Flexibility.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-[#F7B750] to-[#FAD54C] rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Self-Serve or Agency-Managed</h3>
              <p className="text-gray-600 leading-relaxed">
                Hire directly from the marketplace or delegate to an agency (yours or ours). Same transparent platform. Same pricing. Same compliance. You choose what works best.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FAD54C] to-[#F7B750] rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Fast Turnaround</h3>
              <p className="text-gray-600 leading-relaxed">
                Post brief today, get deliverables in 3–5 days. Project scope clarity = faster execution. No back-and-forth on creative direction.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-[#F7B750] to-[#FAD54C] rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Verified Talent Only</h3>
              <p className="text-gray-600 leading-relaxed">
                Every creator and agency on Likelee has a portfolio and track record. You're not hiring blind. You see their past work before you book.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FAD54C] to-[#F7B750] rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Transparent Pricing (No Hidden Markups)</h3>
              <p className="text-gray-600 leading-relaxed">
                Project-based pricing. Whether you hire direct or through an agency, you know exactly what you're paying. No per-slot surprises. No CPM confusion. No 30-day licensing markups.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-[#F7B750] to-[#FAD54C] rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <FileCheck className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Brand-Safe Licensing</h3>
              <p className="text-gray-600 leading-relaxed">
                Every project comes with pre-built, SAG-AFTRA-aligned contracts. Usage rights, territory, duration—all clearly defined and automatically enforced.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FAD54C] to-[#F7B750] rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Legal & Compliance Built In</h3>
              <p className="text-gray-600 leading-relaxed">
                Watermarked assets. Automated DMCA protection. GDPR-compliant. You get verified creators with clear consent. No gray areas.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black transition-all hover:shadow-xl rounded-none bg-white">
              <div className="w-14 h-14 bg-gradient-to-br from-[#F7B750] to-[#FAD54C] rounded-none flex items-center justify-center mb-6 border-2 border-black">
                <Eye className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">One Dashboard</h3>
              <p className="text-gray-600 leading-relaxed">
                Whether you're self-serving or working with an agency, everything runs on Likelee. Browse talent, submit briefs, approve deliverables, manage licenses—all in one place. Agencies stay organized. You stay in control.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 4: How It Works - Split into two paths */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              From Brief to Deliverable. Your Way.
            </h2>
          </div>

          {/* Self-Serve Path */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Self-Serve Path (Direct Hiring)</h3>
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="p-6 border-2 border-black rounded-none bg-white">
                <div className="w-16 h-16 bg-gradient-to-br from-[#F7B750] to-[#FAD54C] border-2 border-black flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Browse Verified Talent</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Filter by creator type, niche, follower count, past work quality, turnaround time. See portfolios before hiring.
                </p>
              </Card>

              <Card className="p-6 border-2 border-black rounded-none bg-white">
                <div className="w-16 h-16 bg-gradient-to-br from-[#FAD54C] to-[#F7B750] border-2 border-black flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold text-white">2</span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Submit Project Brief</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Define deliverables, scope, timeline, budget. Talent reviews and quotes within 24 hours.
                </p>
              </Card>

              <Card className="p-6 border-2 border-black rounded-none bg-white">
                <div className="w-16 h-16 bg-gradient-to-br from-[#F7B750] to-[#FAD54C] border-2 border-black flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold text-white">3</span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Agree & Pay</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Approve brief and talent. Payment goes into escrow (you're protected). Creator starts work.
                </p>
              </Card>

              <Card className="p-6 border-2 border-black rounded-none bg-white">
                <div className="w-16 h-16 bg-gradient-to-br from-[#FAD54C] to-[#F7B750] border-2 border-black flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold text-white">4</span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Approve & Get Deliverables</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Review for 48 hours. Approve and creator gets paid. Payment auto-releases if no dispute.
                </p>
              </Card>
            </div>
          </div>

          {/* Agency-Managed Path */}
          <div>
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Agency-Managed Path (Your Agency or Likelee Partner)</h3>
            <div className="grid md:grid-cols-5 gap-6">
              <Card className="p-6 border-2 border-black rounded-none bg-white">
                <div className="w-16 h-16 bg-gradient-to-br from-[#F7B750] to-[#FAD54C] border-2 border-black flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Invite Agency</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Invite your marketing agency or browse Likelee Partner Agencies.
                </p>
              </Card>

              <Card className="p-6 border-2 border-black rounded-none bg-white">
                <div className="w-16 h-16 bg-gradient-to-br from-[#FAD54C] to-[#F7B750] border-2 border-black flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold text-white">2</span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Agency Handles Sourcing</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Agency searches talent, submits briefs, manages communications.
                </p>
              </Card>

              <Card className="p-6 border-2 border-black rounded-none bg-white">
                <div className="w-16 h-16 bg-gradient-to-br from-[#F7B750] to-[#FAD54C] border-2 border-black flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold text-white">3</span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">You Approve</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Review portfolios and brief before it goes out. Stay in the loop.
                </p>
              </Card>

              <Card className="p-6 border-2 border-black rounded-none bg-white">
                <div className="w-16 h-16 bg-gradient-to-br from-[#FAD54C] to-[#F7B750] border-2 border-black flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold text-white">4</span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Escrow Payment</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Payment goes into escrow. Creator only gets paid after you approve deliverables.
                </p>
              </Card>

              <Card className="p-6 border-2 border-black rounded-none bg-white">
                <div className="w-16 h-16 bg-gradient-to-br from-[#F7B750] to-[#FAD54C] border-2 border-black flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold text-white">5</span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Get Deliverables</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Assets with full licensing and watermarks. Clean, verified usage rights.
                </p>
              </Card>
            </div>
          </div>

          <Card className="p-8 bg-gradient-to-r from-[#F7B750] to-[#FAD54C] border-2 border-black rounded-none text-center mt-12">
            <p className="text-xl text-white font-semibold">
              <span className="font-bold">Why This Matters:</span> You get flexibility. Self-serve for speed and control. Agency-managed for hands-off strategy and expertise. Either way, Likelee keeps everything transparent and organized.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 5: Pricing Model */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Project-Based. Escrow-Protected. You Know the Price Upfront.
            </h2>
            <p className="text-xl text-gray-600">
              We don't do hourly rates. We don't do CPM confusion. We do projects. And we protect your investment.
            </p>
          </div>

          <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h3>
            <div className="space-y-3 text-lg text-gray-700">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#F7B750] flex-shrink-0 mt-1" />
                <p>You post brief with deliverables and budget</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#F7B750] flex-shrink-0 mt-1" />
                <p>Talent quotes a project price</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#F7B750] flex-shrink-0 mt-1" />
                <p>You agree (or negotiate if needed)</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#F7B750] flex-shrink-0 mt-1" />
                <p><span className="font-bold">Payment goes into escrow</span> (you're fully protected)</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#F7B750] flex-shrink-0 mt-1" />
                <p>Creator delivers the work</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#F7B750] flex-shrink-0 mt-1" />
                <p>You review for 48 hours. If approved, creator gets paid immediately. Payment auto-releases after 48 hours if no dispute.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#F7B750] flex-shrink-0 mt-1" />
                <p>You get the full project cost—nothing more</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#F7B750] flex-shrink-0 mt-1" />
                <p>Likelee takes 10%, creator keeps 90%</p>
              </div>
            </div>
          </Card>

          {/* Pricing Examples */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <Card className="p-8 border-2 border-black rounded-none bg-white">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Example Pricing (Verified Creators)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="pb-3 pr-3 font-bold text-gray-900">Project Type</th>
                      <th className="pb-3 px-3 font-bold text-gray-900">Budget</th>
                      <th className="pb-3 pl-3 font-bold text-gray-900">Turnaround</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 pr-3 text-gray-700">15–30s Commercial</td>
                      <td className="py-3 px-3 font-semibold text-gray-900">$500–$1K</td>
                      <td className="py-3 pl-3 text-gray-700">3–5 days</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 pr-3 text-gray-700">3–5 Social Assets</td>
                      <td className="py-3 px-3 font-semibold text-gray-900">$1K–$2K</td>
                      <td className="py-3 pl-3 text-gray-700">5–7 days</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-3 text-gray-700">60s Branded Video</td>
                      <td className="py-3 px-3 font-semibold text-gray-900">$2K–$4K</td>
                      <td className="py-3 pl-3 text-gray-700">7–10 days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-8 border-2 border-black rounded-none bg-white">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Example Pricing (AI Filmmakers)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="pb-3 pr-3 font-bold text-gray-900">Project Type</th>
                      <th className="pb-3 px-3 font-bold text-gray-900">Budget</th>
                      <th className="pb-3 pl-3 font-bold text-gray-900">Turnaround</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 pr-3 text-gray-700">30s Commercial (AI)</td>
                      <td className="py-3 px-3 font-semibold text-gray-900">$300–$800</td>
                      <td className="py-3 pl-3 text-gray-700">2–4 days</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 pr-3 text-gray-700">3–5 Social Clips (AI)</td>
                      <td className="py-3 px-3 font-semibold text-gray-900">$800–$1.5K</td>
                      <td className="py-3 pl-3 text-gray-700">3–5 days</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-3 text-gray-700">Short Film (5–10 min)</td>
                      <td className="py-3 px-3 font-semibold text-gray-900">$1.5K–$3K</td>
                      <td className="py-3 pl-3 text-gray-700">5–7 days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card className="p-8 bg-gradient-to-r from-[#F7B750] to-[#FAD54C] border-2 border-black rounded-none text-center">
            <p className="text-xl text-white font-semibold">
              <span className="font-bold">Why This Matters:</span> You get the exact scope you pay for. No hourly surprises. No invoices that are 30% higher than quoted. Clear budget planning.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 6: Licensing & Compliance */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Verified Consent. Automated Enforcement.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 border-2 border-black rounded-none bg-white">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Smart Contracts</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Every project includes usage rights baked into the agreement:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#F7B750] flex-shrink-0 mt-0.5" />
                  <span>Territory (US only, global, specific regions)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#F7B750] flex-shrink-0 mt-0.5" />
                  <span>Duration (how long you can use it)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#F7B750] flex-shrink-0 mt-0.5" />
                  <span>Channels (social, web, broadcast, OOH)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#F7B750] flex-shrink-0 mt-0.5" />
                  <span>Renewal terms</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 border-2 border-black rounded-none bg-white">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Watermarked Assets</h3>
              <p className="text-gray-700 leading-relaxed">
                Every deliverable includes cryptographic watermark tied to your license. Automatic verification if disputed.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black rounded-none bg-white">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Automated Takedowns</h3>
              <p className="text-gray-700 leading-relaxed">
                If someone uses your asset without rights, Likelee's system flags it and issues DMCA takedowns automatically.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black rounded-none bg-white">
              <h3 className="text-xl font-bold text-gray-900 mb-4">SAG-AFTRA Compliant</h3>
              <p className="text-gray-700 leading-relaxed">
                All creator agreements align with influencer-code guidelines. Your lawyers will approve.
              </p>
            </Card>

            <Card className="p-8 border-2 border-black rounded-none bg-white">
              <h3 className="text-xl font-bold text-gray-900 mb-4">GDPR & CCPA Compliant</h3>
              <p className="text-gray-700 leading-relaxed">
                No PII passed around. Full data sovereignty. You get verified talent, no privacy concerns.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 7: Real Examples */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              See It in Action
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 border-2 border-black rounded-none bg-white">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Campaign Example 1: Fashion Brand (Self-Serve)</h3>
              <div className="space-y-3 text-gray-700">
                <p><span className="font-bold">Need:</span> 5 Instagram Reels featuring verified micro-influencers</p>
                <p>Brand posts brief on Likelee with $2K budget</p>
                <p>Selects 5 creators directly @ $400 each</p>
                <p><span className="font-bold">Payment:</span> $2K goes into escrow upfront (you're protected)</p>
                <p>Creators deliver 5 reels</p>
                <p>Brand reviews and approves within 48 hours → creators get paid</p>
                <p><span className="font-bold">Timeline:</span> 5 days</p>
                <p><span className="font-bold">Deliverables:</span> 5 high-quality reels, ready to post, all rights included</p>
                <p><span className="font-bold">Usage:</span> Instagram only, 30 days</p>
              </div>
            </Card>

            <Card className="p-8 border-2 border-black rounded-none bg-white">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Campaign Example 2: Tech Company (Agency-Managed)</h3>
              <div className="space-y-3 text-gray-700">
                <p><span className="font-bold">Need:</span> 30-second commercial with athlete testimonial</p>
                <p>Marketing agency (on Likelee) searches talent pool</p>
                <p>Finds verified athlete and submits brief</p>
                <p>Brand approves talent and brief</p>
                <p><span className="font-bold">Payment:</span> $800 goes into escrow (you're protected)</p>
                <p>Athlete delivers 30-second video</p>
                <p>Brand approves → athlete gets paid within 48 hours</p>
                <p><span className="font-bold">Timeline:</span> 3 days</p>
                <p><span className="font-bold">Deliverables:</span> 30-second 4K video, watermarked, usage rights for broadcast + web</p>
                <p><span className="font-bold">Usage:</span> TV commercial, social media, global, 90 days</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 8: Early Traction */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
              Trusted by Growing Brands
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-gradient-to-br from-[#F7B750] to-[#FAD54C] border-2 border-black rounded-none text-center">
              <Briefcase className="w-12 h-12 text-white mx-auto mb-4" />
              <p className="text-4xl md:text-5xl font-bold text-white mb-2">120+</p>
              <p className="text-white font-medium">Projects Posted (First Month)</p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-[#FAD54C] to-[#F7B750] border-2 border-black rounded-none text-center">
              <Users className="w-12 h-12 text-white mx-auto mb-4" />
              <p className="text-4xl md:text-5xl font-bold text-white mb-2">47+</p>
              <p className="text-white font-medium">Verified Creators Onboarded</p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-[#F7B750] to-[#FAD54C] border-2 border-black rounded-none text-center">
              <DollarSign className="w-12 h-12 text-white mx-auto mb-4" />
              <p className="text-4xl md:text-5xl font-bold text-white mb-2">$450K+</p>
              <p className="text-white font-medium">In Project Fees Flowing</p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-[#FAD54C] to-[#F7B750] border-2 border-black rounded-none text-center">
              <CheckCircle2 className="w-12 h-12 text-white mx-auto mb-4" />
              <p className="text-4xl md:text-5xl font-bold text-white mb-2">96%</p>
              <p className="text-white font-medium">Project Completion Rate</p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-[#F7B750] to-[#FAD54C] border-2 border-black rounded-none text-center">
              <Clock className="w-12 h-12 text-white mx-auto mb-4" />
              <p className="text-4xl md:text-5xl font-bold text-white mb-2">4</p>
              <p className="text-white font-medium">Average Turnaround: Days</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 9: FAQ */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What's the difference between a Verified Creator and an AI Filmmaker?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Verified Creators are real people who've licensed their likeness (influencers, athletes, actors, models). AI Filmmakers create content using AI tools (Sora, Runway, Pika, etc.). Both are available on Likelee.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can I hire the same talent for multiple campaigns?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. If a creator's contract allows renewal, you can re-book them at the same rates (or renegotiate). Most creators prefer repeat work.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What if I need revisions?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Revisions are project-to-project based on what's agreed upfront. Minor tweaks are usually included. Major scope changes = new project with new pricing.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                How long does approval take?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Most creators respond within 24 hours. Some respond within hours. Urgency is factored into pricing (faster turnaround = higher price, usually).
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can you guarantee deliverables?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Talent is incentivized to deliver (they don't get paid the 50% on completion if they don't). If they fail to deliver, we help you find replacement talent or issue a refund.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What formats do you deliver?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Whatever you request: MP4, MOV, ProRes, social-optimized cuts, etc. Specify in the brief.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What if I exceed the licensed timeframe?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                You can renew the license by re-contracting with the talent. Renewal is usually 20–30% of original project cost.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Is this verified consent?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. Every talent on Likelee has verified their likeness rights. Contracts are SAG-AFTRA-aligned. You're protected.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-9" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What if someone uses my asset without permission?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Watermarks + automated DMCA takedowns. We scan the web and issue takedowns automatically.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-10" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can we negotiate pricing?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. Post your budget. Talent quotes back. You can counter-offer. It's project-based, so there's flexibility.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-11" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can I work with my own agency on Likelee?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. Invite them to manage projects. They source talent, submit briefs, you approve. Same transparent pricing applies.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-12" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Are there agencies I can work with on Likelee?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. Browse Partner Agencies on Likelee. They specialize in different industries and can handle the entire project from sourcing to delivery.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Section 10: CTA */}
      <section className="px-6 py-24 bg-gradient-to-r from-[#F7B750] to-[#FAD54C]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Launch Your First Project Today
          </h2>
          <p className="text-lg md:text-xl text-amber-100 mb-10">
            Browse verified talent. Post a brief. Get deliverables back. All in one platform. No middlemen. No surprise invoices.
          </p>
          <Button 
            onClick={() => navigate(createPageUrl("OrganizationSignup") + "?type=brand_company")}
            className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-white hover:bg-gray-100 text-[#F7B750] border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
          >
            Get Started
          </Button>
        </div>
      </section>
    </div>
  );
}