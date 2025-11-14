
import React from "react";
import { Card } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Likelee Privacy Policy
          </h1>
          <p className="text-gray-600 mb-12">Last updated: October 2025</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <p className="text-gray-700 leading-relaxed">
              Likelee ("Likelee," "we," "us") helps talent, creators, and brands manage licensed, consented use of likeness in AI. This Privacy Policy explains what we collect, how we use it, and your choices.
            </p>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1) Information we collect</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Account & profile data:</strong> name, email, password (hashed), city/state, date of birth, style tags, preferences, links/handles.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Likeness & media:</strong> photos you upload, metadata, and settings you choose for visibility/usage. Note: We only use likeness/media according to the controls you set (e.g., public/private, allowed uses).
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Usage data:</strong> device/browser, IP address, pages viewed, clicks, referring pages.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Communications:</strong> messages and emails you send to us.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>From third parties (optional):</strong> social links or brand/agency info you choose to connect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2) How we use information</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Provide and secure the service (accounts, onboarding, approvals, payouts).</li>
                <li>Enforce your usage rules and create an audit trail.</li>
                <li>Communicate with you (service emails, cohort invites, policy updates).</li>
                <li>Improve features, safety, and performance (analytics and debugging).</li>
                <li>Comply with legal obligations and prevent fraud/abuse.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3) AI & likeness use</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Consent-first:</strong> Your likeness/media is processed only as you direct (e.g., to detect/track use, enable licensed requests).
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Training:</strong> We do not use your likeness/media to train public, third-party models. If we fine-tune internal detection or safety systems, we do so under your selected permissions and access controls.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>Takedowns:</strong> If you report unlicensed use, we may process the reported content to investigate and act.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4) Legal bases (EEA/UK)</h2>
              <p className="text-gray-700 leading-relaxed">
                We process personal data based on: contract (to provide the service), legitimate interests (security, improvement), and consent (where required, e.g., marketing).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5) Sharing</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not sell personal information in the traditional sense. We may license or make available de-identified and/or aggregated information to vetted partners (including analytics and AI technology providers) for research, safety, and product development. We require recipients to use it only for approved purposes and to avoid re-identification.
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">We also share information with:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Service providers (hosting, storage, analytics, email) under contract.</li>
                <li>Counterparties you approve (e.g., brands/agencies for licensed requests you accept).</li>
                <li>Legal/Compliance when required by law or to protect rights, safety, and integrity.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6) Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We keep data while your account is active and as needed for the purposes above. You can request deletion; some records (e.g., payments, contracts, safety logs) may be kept as required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7) Security</h2>
              <p className="text-gray-700 leading-relaxed">
                We use industry-standard safeguards (encryption in transit, access controls). No method is 100% secure; report issues to{" "}
                <a href="mailto:security@likelee.ai" className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline">
                  security@likelee.ai
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8) Your choices & rights</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li>Access, correct, download, or delete your data (subject to legal limits).</li>
                <li>Opt out of marketing at any time.</li>
                <li>Control profile visibility and permitted uses for your likeness/media.</li>
                <li>
                  <strong>Do Not Sell/Share (where applicable):</strong> You may opt out of our licensing of de-identified/aggregated information by using the "Do Not Sell or Share My Personal Information" link or emailing{" "}
                  <a href="mailto:privacy@likelee.ai" className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline">
                    privacy@likelee.ai
                  </a>{" "}
                  with the subject "Do Not Sell/Share."
                </li>
                <li>For EEA/UK/Swiss residents: you may object/restrict processing and lodge a complaint with your local authority.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                <strong>Requests:</strong>{" "}
                <a href="mailto:operations@likelee.ai" className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline">
                  operations@likelee.ai
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9) Cookies & analytics</h2>
              <p className="text-gray-700 leading-relaxed">
                We use cookies and similar tech for sign-in, preferences, and analytics. You can control cookies in your browser; some features may not work without them.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10) Children</h2>
              <p className="text-gray-700 leading-relaxed">
                Likelee is not intended for children under 16 (or the age required by your region). We do not knowingly collect data from children.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11) International transfers</h2>
              <p className="text-gray-700 leading-relaxed">
                If data is transferred internationally, we use appropriate safeguards (e.g., SCCs).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12) Changes</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Policy. We'll post the new date above. If changes are material, we'll notify you (e.g., email or in-app notice).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13) Contact</h2>
              <p className="text-gray-700 leading-relaxed">
                Likelee, Inc.<br />
                <a href="mailto:operations@likelee.ai" className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline">
                  operations@likelee.ai
                </a>
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
}
