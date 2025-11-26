import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

export default function CreatorEconomics() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-blue-50">
      {/* From Creator to Digital Talent Owner */}
      <section className="px-6 py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              From Creator → Digital Talent Owner
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              You've already built your image — now make it work for you.
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-12">
            <p className="text-xl text-gray-300 leading-relaxed text-center mb-8">
              Licensing your likeness isn't selling out; it's scaling up. While
              you're filming your next project, your digital twin can be earning
              in ten more.
            </p>
          </div>

          <Card className="p-8 md:p-12 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-none">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">
              Traditional Model vs. Likelee Likeness Model
            </h3>
            <div className="grid gap-6">
              <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-none">
                <div className="flex-1">
                  <p className="text-gray-400 text-sm mb-2">Traditional Path</p>
                  <p className="text-lg text-white">
                    You perform or shoot manually
                  </p>
                </div>
                <div className="w-12 flex justify-center">
                  <span className="text-[#32C8D1] text-2xl">→</span>
                </div>
                <div className="flex-1 text-right">
                  <p className="text-[#32C8D1] text-sm mb-2">Likelee Model</p>
                  <p className="text-lg text-white">You scale automatically</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-none">
                <div className="flex-1">
                  <p className="text-gray-400 text-sm mb-2">Traditional Path</p>
                  <p className="text-lg text-white">You get paid once</p>
                </div>
                <div className="w-12 flex justify-center">
                  <span className="text-[#32C8D1] text-2xl">→</span>
                </div>
                <div className="flex-1 text-right">
                  <p className="text-[#32C8D1] text-sm mb-2">Likelee Model</p>
                  <p className="text-lg text-white">You earn residuals</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-none">
                <div className="flex-1">
                  <p className="text-gray-400 text-sm mb-2">Traditional Path</p>
                  <p className="text-lg text-white">You often lose IP</p>
                </div>
                <div className="w-12 flex justify-center">
                  <span className="text-[#32C8D1] text-2xl">→</span>
                </div>
                <div className="flex-1 text-right">
                  <p className="text-[#32C8D1] text-sm mb-2">Likelee Model</p>
                  <p className="text-lg text-white">You retain IP</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-none">
                <div className="flex-1">
                  <p className="text-gray-400 text-sm mb-2">Traditional Path</p>
                  <p className="text-lg text-white">
                    You can't reuse or repurpose
                  </p>
                </div>
                <div className="w-12 flex justify-center">
                  <span className="text-[#32C8D1] text-2xl">→</span>
                </div>
                <div className="flex-1 text-right">
                  <p className="text-[#32C8D1] text-sm mb-2">Likelee Model</p>
                  <p className="text-lg text-white">You approve each reuse</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="text-center mt-12">
            <p className="text-2xl font-bold text-[#32C8D1]">
              You're not a gig worker. You're an owner.
            </p>
          </div>
        </div>
      </section>

      {/* Real Faces Real Futures */}
      <section className="px-6 py-20 bg-gradient-to-br from-[#32C8D1] to-teal-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Real Faces. Real Futures.
          </h2>
          <div className="space-y-6 text-lg md:text-xl text-cyan-50 leading-relaxed">
            <p>
              Brands and studios are already generating AI campaigns — most use
              unlicensed or synthetic faces.
            </p>
            <p>Likelee is where real talent powers the AI world.</p>
            <p>
              Every creator, model, and performer is verified, tracked, and paid
              royalties.
            </p>
            <p className="text-2xl md:text-3xl font-bold text-white pt-6">
              You're not being replaced by AI — you're becoming its shareholder.
            </p>
          </div>
        </div>
      </section>

      {/* Creator Value Floor */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Creator Value Floor
            </h2>
          </div>

          <Card className="p-8 md:p-12 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-black rounded-none mb-8">
            <p className="text-xl md:text-2xl text-gray-800 leading-relaxed text-center mb-6">
              No likeness license on Likelee pays below the community minimum.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed text-center">
              You can also set your own floor so brands and studios can't
              lowball you.
            </p>
          </Card>

          <div className="bg-white p-8 border-2 border-black rounded-none">
            <p className="text-xl text-gray-700 leading-relaxed text-center mb-6">
              Transparency builds trust. We publish average creator earnings and
              benchmark data so you always know your true market value.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#32C8D1] mb-2">$350</p>
                <p className="text-sm text-gray-600">Minimum per usage</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#32C8D1] mb-2">$850</p>
                <p className="text-sm text-gray-600">Average per campaign</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#32C8D1] mb-2">15%</p>
                <p className="text-sm text-gray-600">Typical royalty rate</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real Creators, Real Earnings */}
      <section className="px-6 py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Real Creators. Real Earnings.
            </h2>
            <p className="text-xl text-gray-600">
              See what creators, models, and performers are earning through
              likeness licensing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 bg-white border-2 border-black rounded-none hover:shadow-xl transition-all">
              <div className="mb-6">
                <div className="w-12 h-12 bg-[#32C8D1] border-2 border-black rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">$1,524</p>
                <p className="text-sm text-gray-600 mb-4">
                  Royalties across 6 brands
                </p>
              </div>
              <p className="text-gray-700 leading-relaxed">
                → 1 campaign → 6 brand partnerships → ongoing residuals for 9
                months
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none hover:shadow-xl transition-all">
              <div className="mb-6">
                <div className="w-12 h-12 bg-green-500 border-2 border-black rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">$700</p>
                <p className="text-sm text-gray-600 mb-4">
                  Residuals (15% revenue share)
                </p>
              </div>
              <p className="text-gray-700 leading-relaxed">
                → Licensed likeness for a music video → royalties continue as
                views grow
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none hover:shadow-xl transition-all">
              <div className="mb-6">
                <div className="w-12 h-12 bg-teal-500 border-2 border-black rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">$3,200</p>
                <p className="text-sm text-gray-600 mb-4">
                  Annual licensing income
                </p>
              </div>
              <p className="text-gray-700 leading-relaxed">
                → 3 active licenses → recurring monthly royalties → passive
                income stream
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 bg-gradient-to-br from-[#32C8D1] via-teal-500 to-cyan-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to become a digital talent owner?
          </h2>
          <p className="text-xl text-cyan-100 mb-10">
            Join creators, models, and performers building sustainable income
            through likeness licensing.
          </p>
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
