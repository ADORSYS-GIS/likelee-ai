import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Users,
  Shield,
  Target,
  CheckCircle2,
  Zap,
  BarChart3,
  Rocket,
  Award,
  Clock,
  AlertCircle,
} from "lucide-react";

export default function SportsAgency() {
  const navigate = useNavigate();

  useEffect(() => {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Sports Agency NIL Management",
      description:
        "License your athletes' likenesses for AI-powered content. Earn recurring revenue.",
      provider: {
        "@type": "Organization",
        name: "Likelee",
        url: "https://likelee.ai",
      },
      serviceType: "Sports Agency NIL Platform",
      areaServed: "Worldwide",
      audience: {
        "@type": "Audience",
        audienceType: "Sports Agencies, Athlete Representatives",
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
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="px-6 pt-24 pb-16 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="mb-6 bg-gray-100 text-gray-900 px-4 py-2 rounded-none border-2 border-black">
            For Sports Agencies & Athlete Representatives
          </Badge>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight">
            License Your Athletes' Likenesses for
            <span className="block bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              AI-Powered Content
            </span>
          </h1>
          <Card className="p-8 bg-white border-2 border-black shadow-xl rounded-none mb-8">
            <p className="text-xl md:text-2xl text-gray-700 leading-relaxed mb-6">
              Brands are building AI-powered campaigns right now. They need
              verified athlete likenesses. Your athletes should be earning
              recurring royalties from every use.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Zap className="w-8 h-8 text-emerald-600" />
              <p className="text-2xl font-bold text-gray-900">
                Likelee is the infrastructure to make it happen at scale.
              </p>
            </div>
          </Card>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-16 px-10 text-lg font-medium bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white border-2 border-black shadow-xl transition-all hover:scale-105 rounded-none"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Book a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Section 1: The Opportunity */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-green-600 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl rounded-none">
              <Target className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              You Already Know Licensing.
              <span className="block text-emerald-600">
                You're Missing the AI-Powered Opportunity.
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-10">
            <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
              <CheckCircle2 className="w-10 h-10 text-green-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                What You Know
              </h3>
              <div className="space-y-2 text-gray-700">
                <p>✓ You manage athlete sponsorships</p>
                <p>✓ You understand licensing</p>
                <p>✓ You negotiate deals</p>
              </div>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-600 rounded-none">
              <Zap className="w-10 h-10 text-emerald-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                What You're Missing
              </h3>
              <div className="space-y-2 text-gray-700">
                <p>→ Licensing athlete likenesses for AI campaigns</p>
                <p>→ Digital content & synthetic media deals</p>
                <p>→ Recurring royalty infrastructure</p>
              </div>
            </Card>
          </div>

          <Card className="p-8 bg-gradient-to-r from-emerald-600 to-green-600 border-2 border-black rounded-none text-center">
            <p className="text-2xl md:text-3xl font-bold text-white mb-3">
              Brands need this. Athletes should be earning from it.
            </p>
            <p className="text-xl text-white mb-4">
              You're not set up to offer it.
            </p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <DollarSign className="w-10 h-10 text-yellow-300" />
              <p className="text-3xl font-bold text-yellow-300">
                That's recurring revenue you're leaving on the table.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Section 2: The Dashboard */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-emerald-600 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl rounded-none">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
              One Dashboard. All Licenses.
              <span className="block text-green-600">Real Revenue.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-10">
            <Card className="p-6 bg-white border-2 border-black rounded-none text-center">
              <Shield className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <p className="font-bold text-gray-900">
                License athlete likenesses
              </p>
            </Card>
            <Card className="p-6 bg-white border-2 border-black rounded-none text-center">
              <BarChart3 className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <p className="font-bold text-gray-900">Track usage</p>
            </Card>
            <Card className="p-6 bg-white border-2 border-black rounded-none text-center">
              <DollarSign className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <p className="font-bold text-gray-900">
                Collect recurring payments
              </p>
            </Card>
            <Card className="p-6 bg-white border-2 border-black rounded-none text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <p className="font-bold text-gray-900">Manage compliance</p>
            </Card>
          </div>

          <Card className="p-10 bg-gradient-to-br from-emerald-600 to-green-600 border-2 border-black rounded-none text-center shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-4">
                <TrendingUp className="w-12 h-12 text-yellow-300" />
                <p className="text-3xl font-bold text-white">
                  Your athletes earn more.
                </p>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Users className="w-12 h-12 text-yellow-300" />
                <p className="text-3xl font-bold text-white">
                  Your team doesn't grow.
                </p>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Award className="w-12 h-12 text-yellow-300" />
                <p className="text-3xl font-bold text-white">
                  You capture a revenue stream competitors haven't figured out
                  yet.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Section 3: How It Works */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-teal-600 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl rounded-none">
              <Rocket className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 border-2 border-black flex items-center justify-center mb-6 shadow-lg rounded-none">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Register</h3>
              <div className="space-y-2 text-gray-700">
                <p>→ Upload verified athlete data</p>
                <p>→ Government ID verification</p>
                <p>→ Liveness check</p>
              </div>
            </Card>

            <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-teal-600 border-2 border-black flex items-center justify-center mb-6 shadow-lg rounded-none">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Set Terms
              </h3>
              <div className="space-y-2 text-gray-700">
                <p>→ Athletes define what they're OK with</p>
                <p>→ Set pricing</p>
                <p>→ Choose territories & use cases</p>
              </div>
            </Card>

            <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 border-2 border-black flex items-center justify-center mb-6 shadow-lg rounded-none">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Brands License
              </h3>
              <div className="space-y-2 text-gray-700">
                <p>→ Brands search your roster</p>
                <p>→ Submit license requests</p>
                <p>→ You approve each one</p>
              </div>
            </Card>

            <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-teal-600 border-2 border-black flex items-center justify-center mb-6 shadow-lg rounded-none">
                <span className="text-3xl font-bold text-white">4</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Get Paid</h3>
              <div className="space-y-2 text-gray-700">
                <p>→ Payment into escrow</p>
                <p>→ Usage tracked real-time</p>
                <p>→ Recurring royalties flow automatically</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 4: Real Results */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-green-600 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl rounded-none">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Real Results
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-10 bg-white border-2 border-black rounded-none shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-12 h-12 text-emerald-600" />
                <h3 className="text-2xl font-bold text-gray-900">
                  15-Athlete Regional Agency
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <p className="text-lg text-gray-700">
                    <span className="font-bold text-gray-900">
                      $2.5K-$5K/month
                    </span>{" "}
                    per athlete in recurring likeness licensing
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <p className="text-lg text-gray-700">
                    <span className="font-bold text-emerald-600">
                      3-5× more revenue
                    </span>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <p className="text-lg text-gray-700">
                    <span className="font-bold">Same team</span>
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-10 bg-gradient-to-br from-emerald-600 to-green-600 border-2 border-black rounded-none shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <Award className="w-12 h-12 text-yellow-300" />
                <h3 className="text-2xl font-bold text-white">
                  50+ Athlete National Agency
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-6 h-6 text-yellow-300 mt-1 flex-shrink-0" />
                  <p className="text-lg text-white">
                    <span className="font-bold">$150K+/month</span> new
                    recurring revenue from AI-powered likeness licensing
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-6 h-6 text-yellow-300 mt-1 flex-shrink-0" />
                  <p className="text-lg text-white">
                    <span className="font-bold">No new hires needed</span>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Rocket className="w-6 h-6 text-yellow-300 mt-1 flex-shrink-0" />
                  <p className="text-lg text-white">
                    Infrastructure scales with you
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 5: Why This Matters Now */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-green-600 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl rounded-none">
              <Clock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
              Why This Matters
              <span className="block text-emerald-600">Right Now</span>
            </h2>
          </div>

          <div className="space-y-8">
            <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-gray-900 mb-2">
                    AI-powered content is standard
                  </p>
                  <p className="text-lg text-gray-700">
                    Brands are using athlete likenesses in AI campaigns every
                    day
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-600 rounded-none">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-8 h-8 text-red-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    The Question:
                  </p>
                  <p className="text-xl text-gray-700">
                    Are your athletes getting paid?
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-10 bg-gradient-to-br from-emerald-600 to-green-600 border-2 border-black rounded-none text-center shadow-2xl">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Award className="w-12 h-12 text-yellow-300" />
                <p className="text-3xl font-bold text-white">
                  Your Competitive Advantage
                </p>
              </div>
              <p className="text-xl text-white">
                Most agencies aren't set up to offer this. You can be first.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600">
        <div className="max-w-5xl mx-auto text-center">
          <div className="w-24 h-24 bg-white border-2 border-black flex items-center justify-center mx-auto mb-8 shadow-2xl rounded-none">
            <Rocket className="w-12 h-12 text-emerald-600" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight">
            Ready to Scale AI-Powered Likeness Licensing?
          </h2>
          <Card className="p-8 bg-white/10 backdrop-blur-sm border-2 border-white rounded-none mb-10">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <DollarSign className="w-10 h-10 text-yellow-300" />
                <p className="text-2xl font-bold text-white">
                  Your athletes have a revenue stream most agencies aren't
                  offering yet.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Award className="w-10 h-10 text-yellow-300" />
                <p className="text-2xl text-white">
                  Let's talk about bringing your roster live.
                </p>
              </div>
            </div>
          </Card>
          <Button
            onClick={() => navigate(createPageUrl("SalesInquiry"))}
            className="h-20 px-14 text-xl font-bold bg-white hover:bg-gray-100 text-emerald-600 border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
          >
            <Trophy className="w-6 h-6 mr-3" />
            Book a Demo
          </Button>
        </div>
      </section>
    </div>
  );
}
