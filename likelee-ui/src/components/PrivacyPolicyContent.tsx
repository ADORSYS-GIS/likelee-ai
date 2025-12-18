import React from "react";
import { useTranslation } from "react-i18next";

export function PrivacyPolicyContent() {
  const { t } = useTranslation();

  return (
    <div className="prose prose-sm max-w-none space-y-4 text-gray-700">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {t("privacyPolicy.title", "Likelee Privacy Policy")}
      </h1>
      <p className="text-gray-600 mb-6">
        {t("privacyPolicy.lastUpdated", "Last updated: October 2025")}
      </p>

      <p>
        {t(
          "privacyPolicy.intro",
          "Likelee (\"Likelee,\" \"we,\" \"us\") helps talent, creators, and brands manage licensed, consented use of likeness in AI. This Privacy Policy explains what we collect, how we use it, and your choices.",
        )}
      </p>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {t("privacyPolicy.sections.1.title", "1) Information we collect")}
        </h2>
        <p className="mb-2">
          <strong>
            {t("privacyPolicy.sections.1.accountData.label", "Account & profile data:")}
          </strong>{" "}
          {t(
            "privacyPolicy.sections.1.accountData.content",
            "name, email, password (hashed), city/state, date of birth, style tags, preferences, links/handles.",
          )}
        </p>
        <p className="mb-2">
          <strong>
            {t("privacyPolicy.sections.1.likenessMedia.label", "Likeness & media:")}
          </strong>{" "}
          {t(
            "privacyPolicy.sections.1.likenessMedia.content",
            "photos you upload, metadata, and settings you choose for visibility/usage. Note: We only use likeness/media according to the controls you set (e.g., public/private, allowed uses).",
          )}
        </p>
        <p className="mb-2">
          <strong>
            {t("privacyPolicy.sections.1.usageData.label", "Usage data:")}
          </strong>{" "}
          {t(
            "privacyPolicy.sections.1.usageData.content",
            "device/browser, IP address, pages viewed, clicks, referring pages.",
          )}
        </p>
        <p className="mb-2">
          <strong>
            {t("privacyPolicy.sections.1.communications.label", "Communications:")}
          </strong>{" "}
          {t(
            "privacyPolicy.sections.1.communications.content",
            "messages and emails you send to us.",
          )}
        </p>
        <p>
          <strong>
            {t("privacyPolicy.sections.1.thirdParties.label", "From third parties (optional):")}
          </strong>{" "}
          {t(
            "privacyPolicy.sections.1.thirdParties.content",
            "social links or brand/agency info you choose to connect.",
          )}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {t("privacyPolicy.sections.2.title", "2) How we use information")}
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            {t(
              "privacyPolicy.sections.2.list.0",
              "Provide and secure the service (accounts, onboarding, approvals, payouts).",
            )}
          </li>
          <li>{t("privacyPolicy.sections.2.list.1", "Enforce your usage rules and create an audit trail.")}</li>
          <li>
            {t(
              "privacyPolicy.sections.2.list.2",
              "Communicate with you (service emails, cohort invites, policy updates).",
            )}
          </li>
          <li>
            {t(
              "privacyPolicy.sections.2.list.3",
              "Improve features, safety, and performance (analytics and debugging).",
            )}
          </li>
          <li>{t("privacyPolicy.sections.2.list.4", "Comply with legal obligations and prevent fraud/abuse.")}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {t("privacyPolicy.sections.3.title", "3) AI & likeness use")}
        </h2>
        <p className="mb-2">
          <strong>
            {t("privacyPolicy.sections.3.consentFirst.label", "Consent-first:")}
          </strong>{" "}
          {t(
            "privacyPolicy.sections.3.consentFirst.content",
            "Your likeness/media is processed only as you direct (e.g., to detect/track use, enable licensed requests).",
          )}
        </p>
        <p className="mb-2">
          <strong>
            {t("privacyPolicy.sections.3.training.label", "Training:")}
          </strong>{" "}
          {t(
            "privacyPolicy.sections.3.training.content",
            "We do not use your likeness/media to train public, third-party models. If we fine-tune internal detection or safety systems, we do so under your selected permissions and access controls.",
          )}
        </p>
        <p>
          <strong>
            {t("privacyPolicy.sections.3.takedowns.label", "Takedowns:")}
          </strong>{" "}
          {t(
            "privacyPolicy.sections.3.takedowns.content",
            "If you report unlicensed use, we may process the reported content to investigate and act.",
          )}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {t("privacyPolicy.sections.4.title", "4) Legal bases (EEA/UK)")}
        </h2>
        <p>
          {t(
            "privacyPolicy.sections.4.content",
            "We process personal data based on: contract (to provide the service), legitimate interests (security, improvement), and consent (where required, e.g., marketing).",
          )}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {t("privacyPolicy.sections.5.title", "5) Sharing")}
        </h2>
        <p className="mb-2">
          {t(
            "privacyPolicy.sections.5.p1",
            "We do not sell personal information in the traditional sense. We may license or make available de-identified and/or aggregated information to vetted partners (including analytics and AI technology providers) for research, safety, and product development. We require recipients to use it only for approved purposes and to avoid re-identification.",
          )}
        </p>
        <p className="mb-1">
          {t("privacyPolicy.sections.5.p2", "We also share information with:")}
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            {t(
              "privacyPolicy.sections.5.list.0",
              "Service providers (hosting, storage, analytics, email) under contract.",
            )}
          </li>
          <li>
            {t(
              "privacyPolicy.sections.5.list.1",
              "Counterparties you approve (e.g., brands/agencies for licensed requests you accept).",
            )}
          </li>
          <li>
            {t(
              "privacyPolicy.sections.5.list.2",
              "Legal/Compliance when required by law or to protect rights, safety, and integrity.",
            )}
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {t("privacyPolicy.sections.6.title", "6) Retention")}
        </h2>
        <p>
          {t(
            "privacyPolicy.sections.6.content",
            "We keep data while your account is active and as needed for the purposes above. You can request deletion; some records (e.g., payments, contracts, safety logs) may be kept as required by law.",
          )}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {t("privacyPolicy.sections.7.title", "7) Security")}
        </h2>
        <p>
          {t(
            "privacyPolicy.sections.7.content",
            "We use industry-standard safeguards (encryption in transit, access controls). No method is 100% secure; report issues to",
          )}{" "}
          <a
            href="mailto:security@likelee.ai"
            className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline"
          >
            security@likelee.ai
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {t("privacyPolicy.sections.8.title", "8) Your choices & rights")}
        </h2>
        <ul className="list-disc pl-5 space-y-1 mb-2">
          <li>
            {t(
              "privacyPolicy.sections.8.list.0",
              "Access, correct, download, or delete your data (subject to legal limits).",
            )}
          </li>
          <li>{t("privacyPolicy.sections.8.list.1", "Opt out of marketing at any time.")}</li>
          <li>
            {t(
              "privacyPolicy.sections.8.list.2",
              "Control profile visibility and permitted uses for your likeness/media.",
            )}
          </li>
          <li>
            <strong>
              {t("privacyPolicy.sections.8.list.3.label", "Do Not Sell/Share (where applicable):")}
            </strong>{" "}
            {t(
              "privacyPolicy.sections.8.list.3.content",
              "You may opt out of our licensing of de-identified/aggregated information by using the \"Do Not Sell or Share My Personal Information\" link or emailing",
            )}{" "}
            <a
              href="mailto:privacy@likelee.ai"
              className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline"
            >
              privacy@likelee.ai
            </a>{" "}
            {t("privacyPolicy.sections.8.list.3.suffix", "with the subject \"Do Not Sell/Share.\"")}
          </li>
          <li>
            {t(
              "privacyPolicy.sections.8.list.4",
              "For EEA/UK/Swiss residents: you may object/restrict processing and lodge a complaint with your local authority.",
            )}
          </li>
        </ul>
        <p>
          <strong>{t("privacyPolicy.sections.8.requests", "Requests:")}</strong>{" "}
          <a
            href="mailto:operations@likelee.ai"
            className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline"
          >
            operations@likelee.ai
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {t("privacyPolicy.sections.9.title", "9) Cookies & analytics")}
        </h2>
        <p>
          {t(
            "privacyPolicy.sections.9.content",
            "We use cookies and similar tech for sign-in, preferences, and analytics. You can control cookies in your browser; some features may not work without them.",
          )}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {t("privacyPolicy.sections.10.title", "10) Children")}
        </h2>
        <p>
          {t(
            "privacyPolicy.sections.10.content",
            "Likelee is not intended for children under 16 (or the age required by your region). We do not knowingly collect data from children.",
          )}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {t("privacyPolicy.sections.11.title", "11) International transfers")}
        </h2>
        <p>
          {t(
            "privacyPolicy.sections.11.content",
            "If data is transferred internationally, we use appropriate safeguards (e.g., SCCs).",
          )}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {t("privacyPolicy.sections.12.title", "12) Changes")}
        </h2>
        <p>
          {t(
            "privacyPolicy.sections.12.content",
            "We may update this Policy. We'll post the new date above. If changes are material, we'll notify you (e.g., email or in-app notice).",
          )}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {t("privacyPolicy.sections.13.title", "13) Contact")}
        </h2>
        <p>
          {t("privacyPolicy.sections.13.company", "Likelee, Inc.")}
          <br />
          <a
            href="mailto:operations@likelee.ai"
            className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline"
          >
            operations@likelee.ai
          </a>
        </p>
      </section>
    </div>
  );
}
