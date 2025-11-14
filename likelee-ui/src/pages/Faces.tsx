import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, Shield, BarChart3, Upload, Settings, AlertCircle } from "lucide-react";

export default function Creators() {
  const navigate = useNavigate();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  const messages = [
    { line1: "Your Likeness", line2: "Unlimited Earnings" },
    { line1: "Your Consent", line2: "Complete Control" },
    { line1: "Your Terms", line2: "Recurring Revenue" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        setIsFlipping(false);
      }, 300);
    }, 3000);

    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Creators - Monetize Your Likeness",
      "description": "Athletes, influencers, actors, and models - earn retainers from your digital twin. Set your own rates, approve usage, and track royalties.",
      "url": "https://likelee.ai/faces",
      "mainEntity": {
        "@type": "Service",
        "name": "Creator Likeness Licensing",
        "provider": {
          "@type": "Organization",
          "name": "Likelee"
        },
        "serviceType": "Digital Likeness Management",
        "areaServed": "Worldwide",
        "audience": {
          "@type": "Audience",
          "audienceType": "Creators, Athletes, Influencers, Models, Actors"
        }
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      clearInterval(interval);
      document.head.removeChild(script);
    };
  }, [messages.length]);

  return (
    <div className="bg-white">
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
      <section className="relative px-6 pt-20 pb-16 overflow-hidden bg-white">
        <div className="relative max-w-7xl mx-auto">
          <Alert className="mb-8 bg-gray-50 border-2 border-black rounded-none max-w-4xl mx-auto">
            <AlertCircle className="h-5 w-5 text-[#32C8D1]" />
            <AlertDescription className="text-gray-900 font-medium">
              Earn recurring royalties from your likeness. Not one-time payments. Join the first cohort of verified creators, athletes, and talent licensing their image on their terms.
            </AlertDescription>
          </Alert>

          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-6">
              <span 
                className={`block bg-gradient-to-r from-[#32C8D1] via-teal-500 to-cyan-600 bg-clip-text text-transparent ${isFlipping ? 'flip-out' : 'flip-in'}`}
                style={{ minHeight: '2.4em' }}
              >
                <span className="block">{messages[currentMessageIndex].line1}</span>
                <span className="block">{messages[currentMessageIndex].line2}</span>
              </span>
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              License your likeness to brands, studios, and agencies. Set your rates. Keep full control. Earn every month it's in use.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate(createPageUrl("CreatorSignupOptions"))}
                className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black shadow-lg transition-all hover:shadow-xl hover:scale-105 rounded-none"
              >
                Sign Up
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("ForYou"))}
                variant="outline"
                className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium border-2 border-black rounded-none hover:bg-gray-50"
              >
                For You
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Creators, Athletes, and Talent Choose Likelee
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              The fastest way to offer brand-safe AI cameos and earn royalties on every use.
            </p>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Every creator on Likelee licenses their likeness under clear, time-limited rights and keeps the ability to modify, pause, or withdraw permissions at any time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="p-8 bg-white border-2 border-black transition-all hover:shadow-xl group rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Recurring Revenue, Not One-Time Gigs</h3>
              <p className="text-gray-600 leading-relaxed">
                Set your rates. Earn a monthly retainer for every active campaign using your likeness. One $500 shoot used to be it. Now it pays month after month.
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black transition-all hover:shadow-xl group rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Complete Control</h3>
              <p className="text-gray-600 leading-relaxed">
                You approve every use. Pause campaigns anytime. Revoke rights with one click. Your likeness, your rules.
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black transition-all hover:shadow-xl group rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Full Transparency</h3>
              <p className="text-gray-600 leading-relaxed">
                See exactly who's using your image, for how long, in which regions, and how much you've earned. Every campaign tracked, every payment verified.
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black transition-all hover:shadow-xl group rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Usage Rights Dashboard</h3>
              <p className="text-gray-600 leading-relaxed">
                See who's using your likeness, when rights expire, and how much you've earned. Revoke or renew in one click.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Creator Section */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Featured Creator</h2>
          </div>

          <Card className="p-4 md:p-8 bg-white border-2 border-black shadow-xl rounded-none">
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              <div className="md:col-span-1">
                <div className="mb-6">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/3ce34e58b_Screenshot2025-10-24at101047AM.png"
                    alt="Lily"
                    loading="lazy"
                    className="w-full aspect-square object-cover shadow-lg mb-4 border-2 border-black"
                  />
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">Lily</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-gray-900 font-medium text-sm cursor-default">
                      Instagram
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-900 font-medium text-sm cursor-default">
                      TikTok
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm md:text-base">Scottsdale, Arizona</p>
                </div>
              </div>

              <div className="md:col-span-2 space-y-6">
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <Card className="p-4 md:p-6 bg-gray-50 border-2 border-black rounded-none">
                    <DollarSign className="w-8 md:w-10 h-8 md:h-10 text-[#32C8D1] mb-3" />
                    <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Royalties Earned</p>
                    <p className="text-2xl md:text-4xl font-bold text-gray-900">$10,238</p>
                    <p className="text-xs md:text-sm text-gray-500 mt-2">From licensing to 5 brands</p>
                  </Card>

                  <Card className="p-4 md:p-6 bg-gray-50 border-2 border-black rounded-none">
                    <BarChart3 className="w-8 md:w-10 h-8 md:h-10 text-teal-500 mb-3" />
                    <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Usage Requests</p>
                    <p className="text-2xl md:text-4xl font-bold text-gray-900">7</p>
                  </Card>
                </div>

                <div className="bg-gray-50 p-4 md:p-6 border-2 border-black rounded-none">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 md:mb-6">Control Settings</h3>
                  <div className="space-y-4 md:space-y-5">
                    <div className="flex items-center justify-between p-3 md:p-4 bg-white border-2 border-black rounded-none">
                      <span className="text-sm md:text-base text-gray-900 font-medium">Allow Commercial Use</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 md:p-4 bg-white border-2 border-black rounded-none">
                      <span className="text-sm md:text-base text-gray-900 font-medium">Allow Film Use</span>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" className="flex-1 h-12 font-medium border-2 border-black rounded-none text-sm md:text-base">
                    View Usage Report
                  </Button>
                  <Button className="flex-1 h-12 font-medium bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none text-sm md:text-base">
                    Update Settings
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Start Earning in 3 Simple Steps
            </h2>
            <p className="text-xl text-gray-600">From upload to earning - it's that simple.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center border-2 border-black p-8 bg-white">
              <div className="w-24 h-24 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-5xl font-bold text-white">1</span>
              </div>
              <div className="mb-6">
                <Upload className="w-14 h-14 text-[#32C8D1] mx-auto mb-4" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Upload Your Photos</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Create your verified digital identity with high-quality photos.
              </p>
            </div>

            <div className="text-center border-2 border-black p-8 bg-white">
              <div className="w-24 h-24 bg-gradient-to-br from-teal-500 to-cyan-600 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-5xl font-bold text-white">2</span>
              </div>
              <div className="mb-6">
                <Settings className="w-14 h-14 text-teal-500 mx-auto mb-4" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Set Your Parameters</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Define usage rights, pricing, and approval requirements.
              </p>
            </div>

            <div className="text-center border-2 border-black p-8 bg-white">
              <div className="w-24 h-24 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-5xl font-bold text-white">3</span>
              </div>
              <div className="mb-6">
                <DollarSign className="w-14 h-14 text-[#32C8D1] mx-auto mb-4" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Start Earning</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Approve requests. Earn monthly retainers. Scale with multiple concurrent campaigns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* From Creator → Digital Talent Owner */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              From Creator → Digital Talent Owner
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              You've already built your image — now make it work for you.
            </p>
          </div>

          <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none mb-12">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed text-center">
              Licensing your likeness isn't selling out; it's scaling up. While you're filming your next project, your digital twin can be earning in ten more.
            </p>
          </Card>

          <div className="mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Traditional Model vs. Likelee Likeness Model</h3>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">Traditional Path</h4>
                  <p className="text-gray-700">You perform or shoot manually</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-[#32C8D1]/10 to-teal-500/10 border-2 border-[#32C8D1] rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">Likelee Model</h4>
                  <p className="text-gray-700">You scale automatically</p>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">Traditional Path</h4>
                  <p className="text-gray-700">You get paid once per project</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-[#32C8D1]/10 to-teal-500/10 border-2 border-[#32C8D1] rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">Likelee Model</h4>
                  <p className="text-gray-700">You earn monthly retainers as long as brands use your likeness</p>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">Traditional Path</h4>
                  <p className="text-gray-700">You often lose IP</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-[#32C8D1]/10 to-teal-500/10 border-2 border-[#32C8D1] rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">Likelee Model</h4>
                  <p className="text-gray-700">You retain IP</p>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">Traditional Path</h4>
                  <p className="text-gray-700">You can't reuse or repurpose</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-[#32C8D1]/10 to-teal-500/10 border-2 border-[#32C8D1] rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">Likelee Model</h4>
                  <p className="text-gray-700">You approve each reuse</p>
                </Card>
              </div>
            </div>
          </div>

          <Card className="p-8 bg-gradient-to-r from-[#32C8D1] to-teal-500 border-2 border-black rounded-none text-center">
            <p className="text-2xl md:text-3xl font-bold text-white">
              You're not a gig worker. You're an owner.
            </p>
          </Card>
        </div>
      </section>

      {/* Real Faces Real Futures */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Real Faces. Real Futures.
            </h2>
          </div>

          <div className="space-y-6 text-lg text-gray-700 leading-relaxed mb-12">
            <p>
              Brands and studios are already generating AI campaigns — most use unlicensed or synthetic faces.
            </p>
            <p className="font-bold text-gray-900 text-xl">
              Likelee is where real talent powers the AI world.
            </p>
            <p>
              Every creator, model, and performer is verified, tracked, and paid monthly retainers.
            </p>
            <p className="font-bold text-gray-900 text-xl">
              You're not being replaced by AI — you're becoming its monthly revenue stream.
            </p>
          </div>
        </div>
      </section>

      {/* Creator Value Floor */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Creator Value Floor
            </h2>
          </div>

          <div className="space-y-6 text-lg text-gray-700 leading-relaxed mb-12">
            <p>
              No likeness license on Likelee pays below the community minimum.
            </p>
            <p>
              You can also set your own floor so brands and studios can't lowball you.
            </p>
            <p className="font-bold text-gray-900">
              Transparency builds trust. We publish average creator earnings and benchmark data so you always know your true market value.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-gray-50 border-2 border-black rounded-none text-center">
              <p className="text-5xl font-bold text-gray-900 mb-4">$350</p>
              <p className="text-gray-700 font-medium">Minimum monthly retainer per active license</p>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-[#32C8D1]/10 to-teal-500/10 border-2 border-[#32C8D1] rounded-none text-center">
              <p className="text-5xl font-bold text-gray-900 mb-4">$1,200</p>
              <p className="text-gray-700 font-medium">Average monthly retainer per campaign</p>
            </Card>

            <Card className="p-8 bg-gray-50 border-2 border-black rounded-none text-center">
              <p className="text-2xl font-bold text-gray-900 mb-4">As long as licensed</p>
              <p className="text-gray-700 font-medium">Recurring payment while brand uses your likeness</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Real Creators Real Earnings */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Real Creators. Real Earnings.
            </h2>
            <p className="text-xl text-gray-600">
              See what creators, models, and performers are earning through monthly likeness licensing.
            </p>
          </div>

          <div className="space-y-8">
            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="mb-6">
                <p className="text-4xl font-bold text-[#32C8D1] mb-2">$1,500/month</p>
                <p className="text-xl font-semibold text-gray-900 mb-4">Recurring retainer across 3 active brand licenses</p>
              </div>
              <div className="space-y-3 text-gray-700">
                <p>→ License 1 (Brand A): <span className="font-bold">$500/month</span> — Active for 6 months (so far)</p>
                <p>→ License 2 (Brand B): <span className="font-bold">$600/month</span> — Active for 4 months (so far)</p>
                <p>→ License 3 (Brand C): <span className="font-bold">$400/month</span> — Active for 2 months (so far)</p>
                <p className="pt-4 border-t-2 border-gray-200 font-bold text-gray-900">
                  Total earned to date: $7,500 (and still earning monthly as licenses remain active)
                </p>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="mb-6">
                <p className="text-4xl font-bold text-[#32C8D1] mb-2">$700/month</p>
                <p className="text-xl font-semibold text-gray-900 mb-4">Single retainer for music label's AI music video campaign</p>
              </div>
              <div className="space-y-3 text-gray-700">
                <p>→ Licensed for 12-month campaign</p>
                <p>→ Brand uses your likeness for ongoing content generation</p>
                <p>→ You earn $700/month for full year</p>
                <p className="pt-4 border-t-2 border-gray-200 font-bold text-gray-900">
                  Total: $8,400
                </p>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="mb-6">
                <p className="text-4xl font-bold text-[#32C8D1] mb-2">$3,600/year</p>
                <p className="text-xl font-semibold text-gray-900 mb-4">Three licenses stacked together</p>
              </div>
              <div className="space-y-3 text-gray-700">
                <p>→ License 1 (Tech Brand): <span className="font-bold">$400/month × 9 months = $3,600</span></p>
                <p>→ License 2 (Fashion Brand): <span className="font-bold">$300/month × 6 months = $1,800</span></p>
                <p>→ License 3 (Wellness Brand): <span className="font-bold">$250/month × 4 months = $1,000</span></p>
                <p className="pt-4 border-t-2 border-gray-200 font-bold text-gray-900">
                  Combined earnings: $6,400 (and more licenses can be added simultaneously)
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works: Monthly Retainer Model */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              How It Works: Monthly Retainer Model
            </h2>
          </div>

          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 bg-[#32C8D1] rounded-full mt-2 flex-shrink-0"></div>
              <p><span className="font-bold text-gray-900">You license your likeness</span> → Brand gets usage rights</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 bg-[#32C8D1] rounded-full mt-2 flex-shrink-0"></div>
              <p><span className="font-bold text-gray-900">You earn monthly</span> → As long as your license is active, you get paid every month</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 bg-[#32C8D1] rounded-full mt-2 flex-shrink-0"></div>
              <p><span className="font-bold text-gray-900">License is active for X months</span> → You agreed to a 90-day, 6-month, or 12-month license period</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 bg-[#32C8D1] rounded-full mt-2 flex-shrink-0"></div>
              <p><span className="font-bold text-gray-900">When license ends</span> → You decide to renew, revoke, or move on to new brands</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 bg-[#32C8D1] rounded-full mt-2 flex-shrink-0"></div>
              <p><span className="font-bold text-gray-900">You can have multiple licenses at once</span> → Each brand pays you separately, each month</p>
            </div>
          </div>
        </div>
      </section>

      {/* The Monthly Retainer Advantage */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              The Monthly Retainer Advantage
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">✓ Predictable Income</h3>
              <p className="text-gray-700 leading-relaxed">Know exactly how much you're earning each month</p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">✓ Passive While Active</h3>
              <p className="text-gray-700 leading-relaxed">You don't work; the brand generates content; you get paid monthly</p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">✓ Stack Multiple Licenses</h3>
              <p className="text-gray-700 leading-relaxed">Work with 3, 4, or 5 brands at once; get paid by all of them</p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">✓ You Control the Timeline</h3>
              <p className="text-gray-700 leading-relaxed">Set license duration, then decide to renew or end it</p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none md:col-span-2">
              <h3 className="text-xl font-bold text-gray-900 mb-4">✓ Full Transparency</h3>
              <p className="text-gray-700 leading-relaxed">Know exactly which brands are using you and how much you're earning from each</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Real Creators Real Monthly Income */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Real Creators. Real Monthly Income.
          </h2>
          <p className="text-xl text-gray-700 leading-relaxed mb-8">
            Creators on Likelee aren't waiting for payments. They're earning monthly, predictably, passively.
          </p>
          <p className="text-xl font-bold text-gray-900">
            While you create new content, your licensed likeness generates recurring monthly revenue.
          </p>
        </div>
      </section>

      {/* Protect Your Digital Twin Section */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Your Likeness Stays Yours
            </h2>
          </div>

          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p>
              Your consent never expires on its own. Every license has an end date. If you say no, we say no.
            </p>
            <p>
              If a brand wants to keep using your likeness, they renew—and you decide if it's worth it.
            </p>
            <p className="font-semibold text-gray-900">
              Watermarked contracts. Automated takedowns. Real legal protection.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about being a Creator on Likelee
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What is a "Creator"?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                A Creator is any verified individual licensing their likeness (face, voice, or digital twin) for campaigns or AI-assisted productions. You keep ownership of your image; Likelee only facilitates licensed use under your chosen terms.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                How do I get verified?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                After your account is granted into the ecosystem, you'll receive a welcome email and verification link. You'll submit ID and a short selfie video so our system can confirm your authenticity and produce your cameo.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can my likeness be used without consent?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Never. Each usage request requires your explicit approval. No brand, studio, or AI partner can use your likeness unless you've granted permission for that specific context.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can I remove my likeness from the platform?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. You can deactivate or delete your profile anytime. Existing active licences will expire automatically at the end of their contractual term, and no new usages can occur.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What if a brand asks for "in perpetuity" rights?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Likelee does not allow perpetual-use clauses by default. If you choose to accept one, you'll be shown a clear warning about what it means and can negotiate higher compensation or decline.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can my likeness be used to train AI models?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Only if you explicitly enable the "AI training rights" option. This is disabled by default. You'll always see a disclosure when a campaign involves generative or synthetic use.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What protections exist if my likeness is misused?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Likelee tracks every approved asset and maintains digital proofs. If misuse occurs, our rights-enforcement team assists you with takedowns and documentation for legal follow-up.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Do I still own my digital likeness?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. You retain full ownership. You're licensing usage, not transferring ownership. All digital replicas remain tied to your verified identity.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-9" className="border-2 border-black rounded-none bg-white">
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can I negotiate rates for different types of usage?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Absolutely. You can set separate pricing for human-recorded UGC, AI cameos, and full AI digital twins. Our system auto-applies your chosen rate based on campaign type and duration.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 bg-gradient-to-br from-[#32C8D1] via-teal-500 to-cyan-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to become a digital talent owner?
          </h2>
          <p className="text-xl text-white mb-8">
            Join creators, models, and performers building sustainable income through monthly likeness licensing.
          </p>
          
          <div className="bg-white/10 backdrop-blur-sm border-2 border-white p-8 rounded-none mb-10">
            <h3 className="text-2xl font-bold text-white mb-6">How to get started:</h3>
            <div className="space-y-3 text-lg text-white text-left max-w-2xl mx-auto">
              <p>→ Upload your cameo — Record a short video of yourself (AI reference)</p>
              <p>→ Upload reference images — 15 photos from different angles/styles</p>
              <p>→ Set your minimum rate — You decide your floor price ($350+/month)</p>
              <p>→ Brands find you — They request licenses, you approve or decline</p>
              <p>→ Start earning — Monthly payments as long as licenses are active</p>
            </div>
          </div>

          <Button
            onClick={() => navigate(createPageUrl("ReserveProfile"))}
            className="h-16 px-12 text-lg font-medium bg-white hover:bg-gray-100 text-[#32C8D1] border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
          >
            Reserve Your Profile
          </Button>
        </div>
      </section>
    </div>
  );
}