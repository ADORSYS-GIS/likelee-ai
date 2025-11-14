import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Star, MapPin, Briefcase, Zap, UserCheck, Award, TrendingUp, CheckCircle2, DollarSign, Shield, Clock, X, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const creators = [
  {
    name: "Alex Chen",
    specialty: "Cinematic AI Films",
    location: "Los Angeles, CA",
    tools: ["Sora", "Runway Gen-3"],
    projects: 47,
    monthlyEarnings: "$2,100",
    projectsThisMonth: "3 projects",
    turnaround: "5 days",
    approvalRate: "98%",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"
  },
  {
    name: "Maya Rodriguez",
    specialty: "Brand Campaigns",
    location: "New York, NY",
    tools: ["Google Veo", "Luma Dream Machine"],
    projects: 73,
    monthlyEarnings: "$3,600",
    projectsThisMonth: "4 projects",
    turnaround: "4 days",
    approvalRate: "96%",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300"
  },
  {
    name: "Jordan Kim",
    specialty: "Trailers & Edits",
    location: "Nashville, TN",
    tools: ["Sora", "Pika Labs"],
    projects: 29,
    monthlyEarnings: "$1,800",
    projectsThisMonth: "2 projects",
    turnaround: "3 days",
    approvalRate: "99%",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/aafddf154_Screenshot2025-10-13at95036PM.png"
  },
  {
    name: "Sam Taylor",
    specialty: "Documentary AI",
    location: "London, UK",
    tools: ["Runway Gen-3", "Stable Video"],
    projects: 56,
    monthlyEarnings: "$2,700",
    projectsThisMonth: "3 projects",
    turnaround: "6 days",
    approvalRate: "97%",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/cbebd9e9f_Screenshot2025-10-13at94948PM.png"
  }
];

export default function AICreators() {
  const navigate = useNavigate();
  const [showEarnings, setShowEarnings] = useState(false);

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "AI Artists - Create for Leading Brands",
      "description": "AI filmmakers earning $500-$5K per project. Portfolio + Projects + Payment. Studios find you. Clear scope. Payment protected in escrow.",
      "url": "https://likelee.ai/a-i-creators",
      "mainEntity": {
        "@type": "Service",
        "name": "AI Artists Marketplace",
        "provider": {
          "@type": "Organization",
          "name": "Likelee"
        },
        "serviceType": "AI Filmmaking & Creative Services",
        "areaServed": "Worldwide",
        "audience": {
          "@type": "Audience",
          "audienceType": "AI Filmmakers, AI Artists, Creative Professionals"
        }
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
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 overflow-hidden bg-white">
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-6">
            AI Filmmakers Earning
            <span className="block bg-gradient-to-r from-[#F18B6A] via-[#E07A5A] to-[#D06A4A] bg-clip-text text-transparent">
              $500–$5K Per Project
            </span>
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-gray-700 max-w-4xl mx-auto mb-10 leading-relaxed">
            Portfolio + Projects + Payment. Studios and brands find you. Clear project scope. <span className="font-bold text-gray-900">Payment protected in escrow—you get paid when work is done.</span> Keep 80–90% of every project fee. Likelee connects verified AI filmmakers with studios actively seeking quality work.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate(createPageUrl("CreatorSignup"))}
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-gradient-to-r from-[#F18B6A] to-[#E07A5A] hover:from-[#E07A5A] hover:to-[#D06A4A] text-white border-2 border-black shadow-lg transition-all hover:shadow-xl hover:scale-105 rounded-none"
            >
              Reserve Your Profile
            </Button>
            <Button 
              onClick={() => navigate(createPageUrl("AITalentBoard"))}
              variant="outline"
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium border-2 border-black rounded-none hover:bg-gray-50"
            >
              Browse Jobs
            </Button>
          </div>
        </div>
      </section>

      {/* Section 1: How It Works For You */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Your Portfolio. Your Rates. Your Terms.
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Post your portfolio. Set your rates per project. Studios find you based on your work, not your willingness to negotiate down.
            </p>
          </div>

          <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">The Likelee Model</h3>
            <div className="space-y-4 text-lg text-gray-700">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#F18B6A] flex-shrink-0 mt-1" />
                <p>Studios search by style, tools, turnaround time, experience level</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#F18B6A] flex-shrink-0 mt-1" />
                <p>No hourly rates. No time tracking. Project-based only.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#F18B6A] flex-shrink-0 mt-1" />
                <p><span className="font-bold">Clear scope, clear payment:</span> Studio pays into escrow, you get paid when work is done</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#F18B6A] flex-shrink-0 mt-1" />
                <p>Get booked based on portfolio quality and delivery track record</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#F18B6A] flex-shrink-0 mt-1" />
                <p>Repeat bookings from studios who already trust you</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#F18B6A] flex-shrink-0 mt-1" />
                <p className="font-bold text-gray-900">You keep 80–90% of every project fee</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Section 2: What Makes Likelee Different */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Project-Based. Not Hourly. Escrow-Protected.
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              Likelee connects studios with creators through clear, objective-based projects. You know exactly what you're delivering and what you're getting paid—before you start. Payment is protected.
            </p>
          </div>

          <div className="mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">The Model</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-[#F18B6A]" />
                  <h3 className="text-xl font-bold text-gray-900">No hourly rates</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">You quote per project</p>
              </Card>

              <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-[#E07A5A]" />
                  <h3 className="text-xl font-bold text-gray-900">No time tracking</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">No screenshots, no surveillance, no "proof of work"</p>
              </Card>

              <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-[#F18B6A]" />
                  <h3 className="text-xl font-bold text-gray-900">Clear scope</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">Studios define deliverables upfront</p>
              </Card>

              <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-8 h-8 text-[#E07A5A]" />
                  <h3 className="text-xl font-bold text-gray-900">Protected payment</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">Studio pays into escrow, you get paid when work is done (or auto-releases after 48 hours)</p>
              </Card>

              <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="w-8 h-8 text-[#F18B6A]" />
                  <h3 className="text-xl font-bold text-gray-900">Verified portfolios only</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">Studios choose based on your past work, not bids</p>
              </Card>

              <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-8 h-8 text-[#E07A5A]" />
                  <h3 className="text-xl font-bold text-gray-900">Fast payouts</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">Get paid within 3 days of approval</p>
              </Card>

              <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-8 h-8 text-[#F18B6A]" />
                  <h3 className="text-xl font-bold text-gray-900">Repeat bookings</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">Studios re-book reliable creators (less hunting, more steady work)</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: How Much Can You Earn - Collapsed by default */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
              How Much Can I Earn With Likelee?
            </h2>
            <Button
              onClick={() => setShowEarnings(!showEarnings)}
              className="h-14 px-8 text-lg font-medium bg-gradient-to-r from-[#F18B6A] to-[#E07A5A] hover:from-[#E07A5A] hover:to-[#D06A4A] text-white border-2 border-black rounded-none"
            >
              {showEarnings ? "Hide Details" : "Learn More"}
              <ChevronDown className={`w-5 h-5 ml-2 transition-transform ${showEarnings ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {showEarnings && (
            <div className="space-y-12 animate-in fade-in duration-300">
              <div className="text-center">
                <p className="text-xl text-gray-600 mb-4">Real Projects. Real Earnings. Payment Protected.</p>
                <p className="text-lg text-gray-700">
                  You set your rates per project. Studios pay the full amount into escrow (protected). You deliver the work. You get paid when it's done or automatically after 48 hours. You keep 80–90% of the total project fee.
                </p>
              </div>

              {/* Earning Tiers */}
              <div className="grid md:grid-cols-3 gap-8">
                <Card className="p-8 bg-white border-2 border-black rounded-none">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Entry Level Creator</h3>
                  <div className="space-y-4 text-gray-700">
                    <p className="text-lg"><span className="font-bold">2–3 projects per month</span> at $500–$1K per project</p>
                    <p>Quick turnarounds: 15–30 second commercials, social clips, reels</p>
                    <p className="text-sm text-gray-600">Payment: Full amount escrowed, you get paid on approval</p>
                    <p className="font-bold text-[#F18B6A]">You earn: $400–$900 per project (after Likelee's 10%)</p>
                    <p className="text-xl font-bold text-gray-900 pt-4">Total monthly: $800–$2.7K</p>
                  </div>
                </Card>

                <Card className="p-8 bg-gradient-to-br from-[#F18B6A]/10 to-[#E07A5A]/10 border-2 border-black rounded-none">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Growing Creator</h3>
                  <div className="space-y-4 text-gray-700">
                    <p className="text-lg"><span className="font-bold">3–6 projects per month</span> at $1K–$2.5K per project</p>
                    <p>Mix of commercials, brand campaigns, short content</p>
                    <p className="text-sm text-gray-600">Payment: Full amount escrowed, you get paid on approval</p>
                    <p>Studios start re-booking (less time hunting for work)</p>
                    <p className="font-bold text-[#F18B6A]">You earn: $800–$2.25K per project</p>
                    <p className="text-xl font-bold text-gray-900 pt-4">Total monthly: $2.4K–$13.5K</p>
                  </div>
                </Card>

                <Card className="p-8 bg-white border-2 border-black rounded-none">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Specialist Creator</h3>
                  <div className="space-y-4 text-gray-700">
                    <p className="text-lg"><span className="font-bold">4–8 projects per month</span> at $2K–$5K per project</p>
                    <p>Trailers, documentaries, branded films, complex projects</p>
                    <p className="text-sm text-gray-600">Payment: Full amount escrowed, you get paid on approval</p>
                    <p>Booked out weeks in advance by repeat studios</p>
                    <p className="font-bold text-[#F18B6A]">You earn: $1.6K–$4.5K per project</p>
                    <p className="text-xl font-bold text-gray-900 pt-4">Total monthly: $6.4K–$36K+</p>
                  </div>
                </Card>
              </div>

              {/* Sample Projects Table */}
              <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
                  Sample Project Types & Payouts
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="pb-4 pr-4 text-lg font-bold text-gray-900">Project Type</th>
                        <th className="pb-4 px-4 text-lg font-bold text-gray-900">You Quote</th>
                        <th className="pb-4 px-4 text-lg font-bold text-gray-900">Studio Pays (Escrow)</th>
                        <th className="pb-4 px-4 text-lg font-bold text-gray-900">You Keep (90%)</th>
                        <th className="pb-4 pl-4 text-lg font-bold text-gray-900">Timeline</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-4 pr-4 text-gray-700">30s Commercial</td>
                        <td className="py-4 px-4 font-semibold text-gray-900">$500–$800</td>
                        <td className="py-4 px-4 text-gray-700">Full amount escrowed</td>
                        <td className="py-4 px-4 font-bold text-[#F18B6A]">$400–$720</td>
                        <td className="py-4 pl-4 text-gray-700">3–5 days</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-4 pr-4 text-gray-700">Brand Campaign (3–5 assets)</td>
                        <td className="py-4 px-4 font-semibold text-gray-900">$1K–$2K</td>
                        <td className="py-4 px-4 text-gray-700">Full amount escrowed</td>
                        <td className="py-4 px-4 font-bold text-[#F18B6A]">$800–$1.8K</td>
                        <td className="py-4 pl-4 text-gray-700">5–7 days</td>
                      </tr>
                      <tr>
                        <td className="py-4 pr-4 text-gray-700">Short Film (5–10 min)</td>
                        <td className="py-4 px-4 font-semibold text-gray-900">$2K–$5K</td>
                        <td className="py-4 px-4 text-gray-700">Full amount escrowed</td>
                        <td className="py-4 px-4 font-bold text-[#F18B6A]">$1.6K–$4.5K</td>
                        <td className="py-4 pl-4 text-gray-700">7–14 days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="p-8 bg-gradient-to-r from-[#F18B6A] to-[#E07A5A] border-2 border-black rounded-none text-center">
                <p className="text-lg text-white mb-4">
                  <span className="font-bold">Why This Matters:</span> You get paid when work is done (or automatically after 48 hours). No waiting for invoicing. No payment disputes dragging on. Studios are committed because their money is in escrow.
                </p>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Section 4: Platform Comparison */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why AI Creators Choose Likelee Over the Alternatives
            </h2>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto mb-12">
            <table className="w-full text-sm border-2 border-black">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-black">
                  <th className="p-4 text-left font-bold text-gray-900">Factor</th>
                  <th className="p-4 text-left font-bold text-gray-900">Upwork</th>
                  <th className="p-4 text-left font-bold text-gray-900">Fiverr</th>
                  <th className="p-4 text-left font-bold text-gray-900">Direct Agency</th>
                  <th className="p-4 text-left font-bold text-[#F18B6A]">Likelee</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-4 font-semibold text-gray-900">Finding Work</td>
                  <td className="p-4 text-gray-700">Bid against 50+ competitors</td>
                  <td className="p-4 text-gray-700">Browse gigs, low rates</td>
                  <td className="p-4 text-gray-700">Network required</td>
                  <td className="p-4 font-semibold text-[#F18B6A]">Studios find you</td>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="p-4 font-semibold text-gray-900">Payment Model</td>
                  <td className="p-4 text-gray-700">Hourly or project</td>
                  <td className="p-4 text-gray-700">Fixed gigs</td>
                  <td className="p-4 text-gray-700">Invoice 30+ days</td>
                  <td className="p-4 font-semibold text-[#F18B6A]">Project-based, escrow-protected</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-4 font-semibold text-gray-900">Time Tracking</td>
                  <td className="p-4 text-gray-700">Screenshots required</td>
                  <td className="p-4 text-gray-700">Not required</td>
                  <td className="p-4 text-gray-700">Not required</td>
                  <td className="p-4 font-semibold text-[#F18B6A]">Not required</td>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="p-4 font-semibold text-gray-900">Bidding Required</td>
                  <td className="p-4 text-gray-700">Yes (constant)</td>
                  <td className="p-4 text-gray-700">No, but race to bottom</td>
                  <td className="p-4 text-gray-700">No</td>
                  <td className="p-4 font-semibold text-[#F18B6A]">No</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-4 font-semibold text-gray-900">Project Rates</td>
                  <td className="p-4 text-gray-700">$50–$500 (race to bottom)</td>
                  <td className="p-4 text-gray-700">$50–$300 (commoditized)</td>
                  <td className="p-4 text-gray-700">Varies widely</td>
                  <td className="p-4 font-semibold text-[#F18B6A]">$500–$5K (you set)</td>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="p-4 font-semibold text-gray-900">Commission</td>
                  <td className="p-4 text-gray-700">10%</td>
                  <td className="p-4 text-gray-700">20%</td>
                  <td className="p-4 text-gray-700">20–40% markup</td>
                  <td className="p-4 font-semibold text-[#F18B6A]">10%</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-4 font-semibold text-gray-900">Payment Speed</td>
                  <td className="p-4 text-gray-700">14 days (disputes common)</td>
                  <td className="p-4 text-gray-700">14 days</td>
                  <td className="p-4 text-gray-700">30–60 days</td>
                  <td className="p-4 font-semibold text-[#F18B6A]">3 days (escrow-protected)</td>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="p-4 font-semibold text-gray-900">Repeat Bookings</td>
                  <td className="p-4 text-gray-700">Rare (rebid every time)</td>
                  <td className="p-4 text-gray-700">Rare (reorder every time)</td>
                  <td className="p-4 text-gray-700">Possible</td>
                  <td className="p-4 font-semibold text-[#F18B6A]">Built-in (studios re-book)</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-4 font-semibold text-gray-900">Creator Protection</td>
                  <td className="p-4 text-gray-700">Medium (payment disputes)</td>
                  <td className="p-4 text-gray-700">Medium</td>
                  <td className="p-4 text-gray-700">Low (invoicing delays)</td>
                  <td className="p-4 font-semibold text-[#F18B6A]">High (escrow)</td>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="p-4 font-semibold text-gray-900">Portfolio Quality</td>
                  <td className="p-4 text-gray-700">Mixed (anyone can bid)</td>
                  <td className="p-4 text-gray-700">Mixed (gig reviews)</td>
                  <td className="p-4 text-gray-700">Professional</td>
                  <td className="p-4 font-semibold text-[#F18B6A]">Verified only</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-gray-900">Admin Burden</td>
                  <td className="p-4 text-gray-700">High (bidding, negotiating)</td>
                  <td className="p-4 text-gray-700">Medium (messaging)</td>
                  <td className="p-4 text-gray-700">Medium</td>
                  <td className="p-4 font-semibold text-[#F18B6A]">Low (studios search you)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bottom Line Summary */}
          <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">The Bottom Line</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <X className="w-5 h-5 text-red-500" />
                  Upwork
                </h4>
                <p className="text-sm text-gray-700">Constant bidding, time tracking, low rates, payment disputes</p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <X className="w-5 h-5 text-red-500" />
                  Fiverr
                </h4>
                <p className="text-sm text-gray-700">Gigs commoditized, 20% cut, no repeat clients</p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <X className="w-5 h-5 text-red-500" />
                  Direct Agency
                </h4>
                <p className="text-sm text-gray-700">Networking required, slow payments, limited opportunities</p>
              </div>
              <div>
                <h4 className="font-bold text-[#F18B6A] mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#F18B6A]" />
                  Likelee
                </h4>
                <p className="text-sm text-gray-700">Studios find you, project-based rates, escrow protection, fast payments, repeat bookings</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Section 5: Meet Our AI Artists */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Meet Our AI Artists
            </h2>
            <p className="text-lg md:text-xl text-gray-600">
              Discover the talented creators already building their careers on Likelee.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {creators.map((creator, index) => (
              <Card key={index} className="p-6 bg-white hover:shadow-2xl transition-all hover:-translate-y-2 border-2 border-black rounded-none">
                <img
                  src={creator.image}
                  alt={creator.name}
                  loading="lazy"
                  className="w-full h-40 sm:h-48 object-cover mb-4 shadow-md border-2 border-black"
                />
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">{creator.name}</h3>
                <p className="text-base md:text-lg text-[#F18B6A] font-medium mb-3">{creator.specialty}</p>
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                  <MapPin className="w-4 h-4 text-[#E07A5A]" />
                  <span>{creator.location}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {creator.tools.map((tool, i) => (
                    <Badge key={i} className="bg-orange-100 text-orange-700 text-xs px-2 py-1 border-2 border-black rounded-none">
                      {tool}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-2 text-sm text-gray-700 mb-4">
                  <p><span className="font-bold">{creator.projects} projects delivered</span></p>
                  <p className="text-[#F18B6A] font-bold">{creator.monthlyEarnings} earned this month ({creator.projectsThisMonth})</p>
                  <p>Avg. turnaround: <span className="font-semibold">{creator.turnaround}</span></p>
                  <p>Approval rate: <span className="font-semibold">{creator.approvalRate}</span></p>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-gradient-to-r from-[#F18B6A] to-[#E07A5A] hover:from-[#E07A5A] hover:to-[#D06A4A] text-white border-2 border-black rounded-none text-sm">
                    View Portfolio
                  </Button>
                  <Button variant="outline" className="flex-1 border-2 border-black rounded-none text-sm">
                    Hire
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: How It Works */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              From Portfolio to Paycheck
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center border-2 border-black p-8 bg-gray-50">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-[#F18B6A] to-[#E07A5A] border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-4xl sm:text-5xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Create Profile</h3>
              <p className="text-gray-600 leading-relaxed text-base md:text-lg">
                Upload your best work. Include projects you've completed, tools you use, and your typical turnaround time. No time tracking needed.
              </p>
            </div>

            <div className="text-center border-2 border-black p-8 bg-gray-50">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-[#E07A5A] to-[#D06A4A] border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-4xl sm:text-5xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Set Your Rates</h3>
              <p className="text-gray-600 leading-relaxed text-base md:text-lg">
                You decide what to charge per project. $500 for quick commercials, $2K for campaigns, $5K for larger work. Project-based, not hourly.
              </p>
            </div>

            <div className="text-center border-2 border-black p-8 bg-gray-50">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-[#F18B6A] to-[#E07A5A] border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-4xl sm:text-5xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Get Discovered</h3>
              <p className="text-gray-600 leading-relaxed text-base md:text-lg">
                Studios search by style, tools, experience, and turnaround time. Your portfolio shows up when it matches what they need.
              </p>
            </div>

            <div className="text-center border-2 border-black p-8 bg-gray-50">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-[#E07A5A] to-[#D06A4A] border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-4xl sm:text-5xl font-bold text-white">4</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Deliver & Get Paid</h3>
              <p className="text-gray-600 leading-relaxed text-base md:text-lg">
                Studio approves the brief. Full payment goes into escrow (protected). You deliver the work. You get paid when done or automatically after 48 hours. You keep 80–90%.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: FAQ */}
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
                What are AI Artists on Likelee?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                AI Artists are AI filmmakers who create video content using tools like Sora, Runway, Pika, Google Veo, and more. You set project-based rates, studios find your work, and you get booked for defined projects with clear scopes.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Is this hourly work?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                No. Likelee is project-based only. You quote per project, not per hour. No time tracking. No surveillance. Clear scope, clear payment.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                How does the payment work?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Studio pays the full project amount into escrow (protected). You deliver the work. You get paid when it's done, or automatically after 48 hours if no dispute. You keep 80–90%. Payment processes within 3 days.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                How do I set my rates?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                You choose project-based rates. A 30-second commercial might be $500. A campaign could be $2K–$5K. You decide what's fair for your time and expertise.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What kind of projects can I take on?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Commercials, brand campaigns, social content, short films, trailers, music videos, explainer videos—anything you can create with AI tools.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Do I need my own AI tools?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. You need access to tools like Sora, Runway, Pika, Google Veo, etc. Likelee doesn't provide tools—just the marketplace to sell your work.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can clients request revisions?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. Revisions are handled project-to-project based on what's agreed upfront. Major scope changes = new project.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can I collaborate with other AI Artists?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. Some larger projects may need multiple creators.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-9" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                How much can I earn?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                It depends on your rates and project frequency. Entry-level creators typically earn $800–$2.7K/month. Growing creators make $2.4K–$13.5K+/month. Specialists make $6.4K+/month. See earning examples above.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Section 8: CTA */}
      <section className="px-6 py-24 bg-gradient-to-br from-[#F18B6A] via-[#E07A5A] to-[#D06A4A]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Earn from Your AI Work?
          </h2>
          <p className="text-lg md:text-xl text-orange-100 mb-10">
            Join AI creators already booking projects every month.<br />
            Set your rates. Build your portfolio. Get discovered by studios who value quality work.
          </p>
          <Button 
            onClick={() => navigate(createPageUrl("CreatorSignup"))}
            className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-white hover:bg-gray-100 text-[#F18B6A] border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
          >
            Reserve Your Profile Now
          </Button>
        </div>
      </section>
    </div>
  );
}