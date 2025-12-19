import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import {
  Shield,
  DollarSign,
  Users,
  CheckCircle,
  Eye,
  Lock,
} from "lucide-react";

export default function ForYou() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-blue-50">
      {/* Hero Section */}
      <section className="px-6 pt-24 pb-16 border-b-2 border-black">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8">
            The Future Belongs to
            <span className="block bg-gradient-to-r from-[#32C8D1] to-teal-600 bg-clip-text text-transparent">
              Real Creators
            </span>
          </h1>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Section 1 */}
          <div className="bg-white p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              AI video generation is transforming every corner of the
              entertainment and advertising world. Soon, the majority of content
              — campaigns, ads, short films, social media — will be AI-assisted
              or fully AI-generated.
            </p>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              <span className="font-bold">Why?</span> Because it's faster,
              cheaper, and infinitely scalable.
            </p>
            <p className="text-xl text-gray-700 leading-relaxed mb-8">
              But here's the reality: no matter how advanced the tech gets,
              people still connect with people. Brands know this. Audiences
              crave authenticity. They want to see real faces, real energy, real
              emotion — even in AI-driven content.
            </p>
            <p className="text-2xl text-gray-900 font-bold mb-6">
              That's where you come in.
            </p>
            <div className="space-y-4">
              <p className="text-xl text-[#32C8D1] font-semibold">
                Your likeness gives AI content its humanity.
              </p>
              <p className="text-xl text-[#32C8D1] font-semibold">
                Your face makes it relatable.
              </p>
              <p className="text-xl text-[#32C8D1] font-semibold">
                Your presence makes it real.
              </p>
            </div>
            <p className="text-xl text-gray-700 leading-relaxed mt-6">
              Companies don't need more AI—they need you, represented ethically
              and compensated fairly.
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-gradient-to-br from-[#32C8D1]/10 to-teal-50 p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              You Don't Have to Chase Algorithms to Be Seen
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              The old system was built on gatekeeping:
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#32C8D1] rounded-full mt-3 flex-shrink-0" />
                <p className="text-lg text-gray-700">
                  Algorithms decided who gets reach.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#32C8D1] rounded-full mt-3 flex-shrink-0" />
                <p className="text-lg text-gray-700">
                  Agencies decided who gets representation.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#32C8D1] rounded-full mt-3 flex-shrink-0" />
                <p className="text-lg text-gray-700">
                  Geography decided who gets a shot.
                </p>
              </li>
            </ul>
            <p className="text-2xl text-gray-900 font-bold mb-6">
              That world is fading fast.
            </p>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              With Likelee, you become part of a new creative economy—where
              visibility isn't earned through followers or luck, but through
              verified ownership of your likeness.
            </p>
            <p className="text-xl text-gray-700 leading-relaxed">
              Whether you're an influencer, model, actor, or UGC creator, your
              face can work for you — safely, transparently, and at scale.
            </p>
          </div>

          {/* What Likelee Offers */}
          <div className="bg-white p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-10">
              What Likelee Offers
            </h2>
            <div className="grid gap-8">
              <div className="flex gap-6">
                <div className="w-12 h-12 bg-[#32C8D1] border-2 border-black flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Work With Brands That Match Your Identity
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Partner with companies you believe in. Appear in digital
                    campaigns, films, or branded content that align with your
                    image, style, and values.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-12 h-12 bg-green-500 border-2 border-black flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Earn Royalties From Your Likeness
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Every time your face appears in content, you earn. No hidden
                    rates, no confusion — transparent licensing and verifiable
                    payouts, tracked through Likelee.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-12 h-12 bg-teal-500 border-2 border-black flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Expand Your Reach Without Constant Posting
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    You don't need to be online 24/7 to grow your presence. Once
                    your likeness is verified, brands and studios can license it
                    for campaigns worldwide.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-12 h-12 bg-cyan-600 border-2 border-black flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Stay Fully in Control
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    You decide who can license your likeness, what for, and for
                    how long. You're in control of where your face appears —
                    down to the category, brand, and medium.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-gray-900 text-white p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <div className="flex items-center gap-4 mb-8">
              <Shield className="w-12 h-12 text-[#32C8D1]" />
              <h2 className="text-3xl md:text-4xl font-bold">
                Security Is Non-Negotiable
              </h2>
            </div>
            <p className="text-xl leading-relaxed mb-8">
              We've seen what happens when creators aren't protected —
              unauthorized deepfakes, brand misuse, and faces appearing in
              content they never approved.
            </p>
            <p className="text-2xl font-bold text-[#32C8D1] mb-8">
              Likelee is built to prevent that.
            </p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <Lock className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    Explicit Consent Only
                  </h3>
                  <p className="text-lg leading-relaxed text-gray-300">
                    Your likeness can't appear anywhere you haven't approved.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Eye className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Usage Monitoring</h3>
                  <p className="text-lg leading-relaxed text-gray-300">
                    Track every authorized and unauthorized appearance of your
                    face across the web.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Shield className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Active Protection</h3>
                  <p className="text-lg leading-relaxed text-gray-300">
                    If your likeness is misused, our rights team intervenes —
                    fast.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xl font-semibold mt-8 text-[#32C8D1]">
              We're not just a platform. We're the infrastructure protecting
              your digital identity.
            </p>
          </div>

          {/* Next Phase Section */}
          <div className="bg-white p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              This Is the Next Phase of the Creator Economy
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              Brands are waking up. They know AI content without human
              connection doesn't perform. The future belongs to creators who
              understand their worth — and protect it.
            </p>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              With Likelee, you're not just another face in a feed. You're a
              verified identity in a new creative economy — one where likeness
              itself becomes an asset.
            </p>
            <div className="space-y-4 my-8">
              <p className="text-xl text-[#32C8D1] font-bold">
                You don't need millions of followers.
              </p>
              <p className="text-xl text-[#32C8D1] font-bold">
                You don't need to fit a mold.
              </p>
              <p className="text-xl text-[#32C8D1] font-bold">
                You just need to own your presence.
              </p>
            </div>
            <p className="text-2xl text-gray-900 font-bold">
              Because now, your face is your platform.
            </p>
          </div>

          {/* Final CTA Section */}
          <div className="bg-gradient-to-br from-[#32C8D1]/10 to-teal-50 p-8 md:p-12 border-2 border-black shadow-lg rounded-none text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Ready to License Your Likeness?
            </h2>
            <p className="text-xl text-gray-700 mb-4">
              Join Likelee and take control of how your image moves through the
              world.
            </p>
            <p className="text-xl text-gray-700 mb-8">
              Protect it. License it. Earn from it — ethically and
              transparently.
            </p>
            <p className="text-lg text-gray-600 mb-8">
              Reserve Your Profile and be part of the first generation of
              creators defining the human side of AI.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 bg-gradient-to-br from-[#32C8D1] to-teal-600 border-t-2 border-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-cyan-100 mb-10">
            Reserve your profile and join the first cohort of creators defining
            the future.
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
