import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ScolarNav collects, uses, and protects your personal data.",
};

const LAST_UPDATED = "4 September 2026";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-14 sm:py-20">
      <p className="font-mono text-xs tracking-widest uppercase text-brass mb-2">Legal</p>
      <h1 className="font-display text-4xl sm:text-5xl text-ink leading-tight">Privacy Policy</h1>
      <p className="text-slate text-sm font-mono mt-3">Last updated: {LAST_UPDATED}</p>

      <div className="mt-6 case-card p-5">
        <p className="text-sm text-ink-soft leading-relaxed">
          <strong className="text-ink">Short version:</strong> We collect only what we need to run ScolarNav.
          We do not sell your data. You can delete everything at any time. The rest of this policy explains
          the details.
        </p>
      </div>

      <div className="mt-10 space-y-10 text-ink-soft leading-relaxed">

        <section>
          <h2 className="font-display text-xl text-ink mb-3">1. Who We Are</h2>
          <p>
            ScolarNav is operated by ScolarNav ("we", "us", "our"), a company focused on
            helping African students access global scholarship and education opportunities. This policy
            explains how we collect, use, store, and protect your personal data when you use the ScolarNav
            platform.
          </p>
          <p className="mt-3">
            For data protection purposes, ScolarNav is the data controller. You can reach
            us at{" "}
            <a href="mailto:mail@ScolarNav.com" className="text-forest hover:underline">
              mail@ScolarNav.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">2. Data We Collect</h2>

          <h3 className="font-medium text-ink mt-4 mb-2">2.1 Account information</h3>
          <p>
            When you register, we collect your full name, email address, country, and a hashed password
            (we never store your password in plain text). If you sign up via Google, we receive your name,
            email, and profile picture from Google — no password is stored.
          </p>

          <h3 className="font-medium text-ink mt-4 mb-2">2.2 CV and profile data</h3>
          <p>
            If you upload a CV, we parse and store its contents — including education history, work
            experience, skills, languages, and certifications — to power our personalised matching and
            coaching features. You can delete your CV at any time from your profile.
          </p>

          <h3 className="font-medium text-ink mt-4 mb-2">2.3 Usage data</h3>
          <p>
            We record which opportunities you save, your application status updates, coaching sessions,
            interview practice sessions, and readiness scores. This data is used to personalise your
            experience and is not shared with scholarship providers.
          </p>

          <h3 className="font-medium text-ink mt-4 mb-2">2.4 Payment data</h3>
          <p>
            Payments are processed by Stripe (international) or Paystack (African users). We do not store
            your card details — those are held securely by the payment processor. We do store a record of
            your subscription status, plan, and payment history.
          </p>

          <h3 className="font-medium text-ink mt-4 mb-2">2.5 Technical data</h3>
          <p>
            We collect standard server logs including IP address, browser type, and pages visited, for
            security monitoring and debugging. These are not linked to your personal profile.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">3. How We Use Your Data</h2>
          <ul className="space-y-2 list-disc list-inside">
            <li>To create and manage your account.</li>
            <li>To match you with relevant scholarship and funding opportunities.</li>
            <li>To provide AI-powered coaching, interview practice, roadmaps, and readiness scores.</li>
            <li>To process payments and manage your subscription.</li>
            <li>To send transactional emails (account verification, password reset, subscription receipts).</li>
            <li>To send product updates and relevant opportunities — you can opt out at any time.</li>
            <li>To detect and prevent fraud, abuse, and security incidents.</li>
            <li>To comply with legal obligations.</li>
          </ul>
          <p className="mt-4">
            We do not use your data to train AI models, build advertising profiles, or sell to data brokers.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">4. Legal Basis for Processing</h2>
          <p>We process your data on the following legal bases:</p>
          <ul className="mt-3 space-y-2 list-disc list-inside">
            <li><strong className="text-ink">Contract:</strong> Processing necessary to deliver the services you signed up for.</li>
            <li><strong className="text-ink">Legitimate interests:</strong> Security, fraud prevention, and improving the platform.</li>
            <li><strong className="text-ink">Consent:</strong> Marketing emails — you can withdraw consent at any time.</li>
            <li><strong className="text-ink">Legal obligation:</strong> Where we are required to retain data by law.</li>
          </ul>
          <p className="mt-3 text-xs font-mono text-slate">
            This policy is compliant with the Nigeria Data Protection Act 2023 (NDPA) and, where applicable,
            the EU General Data Protection Regulation (GDPR).
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">5. AI Processing</h2>
          <p>
            ScolarNav uses Claude (by Anthropic) to power its coaching, mentor, interview, and roadmap
            features. When you use these features, relevant parts of your profile and CV are sent to
            Anthropic's API to generate a response. Anthropic processes this data under their own privacy
            policy and does not use API inputs to train their models.
          </p>
          <p className="mt-3">
            AI-generated content is for coaching purposes only. We do not share your data with scholarship
            committees or institutions.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">6. Who We Share Data With</h2>
          <p>We share your data only with the following parties, and only as needed to deliver the service:</p>
          <div className="mt-4 space-y-4">
            {[
              {
                name: "Anthropic",
                purpose: "AI coaching and content generation",
                link: "https://www.anthropic.com/privacy",
              },
              {
                name: "Stripe",
                purpose: "Payment processing for international users",
                link: "https://stripe.com/privacy",
              },
              {
                name: "Paystack",
                purpose: "Payment processing for African users",
                link: "https://paystack.com/privacy",
              },
              {
                name: "Google",
                purpose: "Optional Google Sign-In authentication",
                link: "https://policies.google.com/privacy",
              },
              {
                name: "Zoho Mail",
                purpose: "Transactional and onboarding emails",
                link: "https://www.zoho.com/privacy.html",
              },
              {
                name: "MongoDB Atlas",
                purpose: "Secure cloud database hosting",
                link: "https://www.mongodb.com/legal/privacy-policy",
              },
            ].map(({ name, purpose, link }) => (
              <div key={name} className="flex gap-4 p-4 case-card">
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{name}</p>
                  <p className="text-xs text-slate mt-0.5">{purpose}</p>
                </div>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-forest hover:underline shrink-0 self-center"
                >
                  Privacy policy →
                </a>
              </div>
            ))}
          </div>
          <p className="mt-4">
            We do not sell, rent, or trade your personal data with any other third party.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">7. Data Retention</h2>
          <p>
            We retain your account data for as long as your account is active. If you delete your account,
            we permanently delete your profile, CV, coaching history, and personal data within 30 days —
            except where we are legally required to retain certain records (e.g. payment records for tax
            compliance, typically 7 years).
          </p>
          <p className="mt-3">
            You can delete your CV independently from your account at any time from your profile settings.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">8. Your Rights</h2>
          <p>Under applicable data protection law, you have the right to:</p>
          <ul className="mt-3 space-y-2 list-disc list-inside">
            <li><strong className="text-ink">Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong className="text-ink">Correction:</strong> Ask us to correct inaccurate or incomplete data.</li>
            <li><strong className="text-ink">Deletion:</strong> Ask us to delete your data (subject to legal retention obligations).</li>
            <li><strong className="text-ink">Portability:</strong> Receive your data in a structured, machine-readable format.</li>
            <li><strong className="text-ink">Objection:</strong> Object to processing based on legitimate interests.</li>
            <li><strong className="text-ink">Withdrawal of consent:</strong> Opt out of marketing emails at any time.</li>
          </ul>
          <p className="mt-4">
            To exercise any of these rights, email us at{" "}
            <a href="mailto:mail@ScolarNav.com" className="text-forest hover:underline">
              mail@ScolarNav.com
            </a>
            . We will respond within 30 days. Account deletion is also available directly in your profile settings.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">9. Security</h2>
          <p>
            We take security seriously. Passwords are hashed using bcrypt before storage — we never see your
            plain-text password. Data in transit is encrypted via TLS. Access to production systems is
            restricted to authorised team members only.
          </p>
          <p className="mt-3">
            No system is perfectly secure. If you discover a vulnerability, please disclose it responsibly
            to{" "}
            <a href="mailto:mail@ScolarNav.com" className="text-forest hover:underline">
              mail@ScolarNav.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">10. Cookies & Local Storage</h2>
          <p>
            When you first visit ScolarNav, we display a cookie consent banner. You can choose to accept all
            cookies or essential cookies only. Your preference is stored in your browser so we don't ask again.
          </p>
          <div className="mt-4 space-y-3">
            <div className="case-card p-4">
              <p className="text-sm font-medium text-ink">Essential (always active)</p>
              <p className="text-xs text-slate mt-1">
                A JWT authentication token stored in localStorage to keep you logged in across sessions.
                Your cookie consent preference. These are strictly necessary and cannot be disabled.
              </p>
            </div>
            <div className="case-card p-4">
              <p className="text-sm font-medium text-ink">Optional (with consent)</p>
              <p className="text-xs text-slate mt-1">
                Cookies set by Google Sign-In and Google's identity services when you use that feature.
                These are governed by Google's own cookie and privacy policy.
              </p>
            </div>
          </div>
          <p className="mt-4">
            We do not use advertising cookies, tracking pixels, or third-party analytics cookies. You can
            withdraw or change your cookie consent at any time by clearing your browser's localStorage for
            this site.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">11. Children's Privacy</h2>
          <p>
            ScolarNav is not intended for children under 16. We do not knowingly collect personal data from
            anyone under 16. If you believe a child has provided us with personal data, please contact us
            and we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">12. International Transfers</h2>
          <p>
            Your data may be processed outside Nigeria or your home country — for example, on servers
            operated by MongoDB Atlas, Anthropic, or Stripe. Where this occurs, we ensure that appropriate
            safeguards are in place (such as standard contractual clauses or the recipient's certification
            under an equivalent framework).
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">13. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we make material changes, we will
            notify you by email or in-app notice. The "last updated" date at the top of this page reflects
            the most recent revision.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">14. Contact & Complaints</h2>
          <p>
            For privacy-related questions or to exercise your rights, contact us at{" "}
            <a href="mailto:mail@ScolarNav.com" className="text-forest hover:underline">
              mail@ScolarNav.com
            </a>
            .
          </p>
          <p className="mt-3">
            If you are based in Nigeria and are unsatisfied with our response, you have the right to lodge a
            complaint with the Nigeria Data Protection Commission (NDPC) at{" "}
            <a
              href="https://ndpc.gov.ng"
              target="_blank"
              rel="noopener noreferrer"
              className="text-forest hover:underline"
            >
              ndpc.gov.ng
            </a>
            .
          </p>
        </section>

      </div>

      <div className="mt-14 pt-8 border-t border-rule flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <p className="text-xs font-mono text-slate">© 2026 ScolarNav. All rights reserved.</p>
        <Link href="/terms" className="text-sm text-forest font-medium hover:underline">
          Terms of Service →
        </Link>
      </div>
    </div>
  );
}
