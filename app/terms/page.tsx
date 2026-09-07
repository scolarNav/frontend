import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using ScolarNav â€” the scholarship coaching platform.",
};

const LAST_UPDATED = "4 September 2026";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-14 sm:py-20">
      <p className="font-mono text-xs tracking-widest uppercase text-brass mb-2">Legal</p>
      <h1 className="font-display text-4xl sm:text-5xl text-ink leading-tight">Terms of Service</h1>
      <p className="text-slate text-sm font-mono mt-3">Last updated: {LAST_UPDATED}</p>

      <div className="mt-10 space-y-10 text-ink-soft leading-relaxed">

        <section>
          <h2 className="font-display text-xl text-ink mb-3">1. About ScolarNav</h2>
          <p>
            ScolarNav ("we", "us", "our") is an AI-powered scholarship coaching platform that helps students â€”
            primarily from Africa â€” discover opportunities, strengthen their applications, and prepare for
            interviews. ScolarNav is operated by ScolarNav.
          </p>
          <p className="mt-3">
            By creating an account or using any part of the ScolarNav platform, you ("you", "user") agree to
            these Terms of Service. If you do not agree, please do not use the platform.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">2. Eligibility</h2>
          <p>
            You must be at least 16 years old to use ScolarNav. By using the platform, you confirm that you
            meet this requirement. If you are under 18, you should review these terms with a parent or
            guardian.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">3. Your Account</h2>
          <p>
            You are responsible for keeping your login credentials secure and for all activity that occurs
            under your account. Notify us immediately at{" "}
            <a href="mailto:mail@ScolarNav.com" className="text-forest hover:underline">
              mail@ScolarNav.com
            </a>{" "}
            if you suspect unauthorised access.
          </p>
          <p className="mt-3">
            You may register using an email address and password, or via Google Sign-In. Each person may
            hold one account. Creating duplicate or fraudulent accounts is prohibited.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">4. Free and Pro Plans</h2>
          <p>
            ScolarNav offers a free tier and a Pro subscription. Free features are available indefinitely with
            no credit card required. Pro features are unlocked upon payment of the applicable subscription
            fee (monthly or annual).
          </p>
          <p className="mt-3">
            Pro subscriptions include a 7-day free trial. After the trial, your chosen billing cycle begins
            automatically. You may cancel at any time before the trial ends to avoid charges. Cancellation
            takes effect at the end of the current billing period â€” you retain Pro access until then.
          </p>
          <p className="mt-3">
            Prices are listed in USD. Users in supported African countries are billed in local currency via
            Paystack. We reserve the right to adjust pricing with 30 days' notice.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">5. Refunds</h2>
          <p>
            Because the 7-day trial lets you evaluate the platform before any charge, we do not offer
            refunds for subscription fees already paid. If you believe you were charged in error, contact us
            at{" "}
            <a href="mailto:mail@ScolarNav.com" className="text-forest hover:underline">
              mail@ScolarNav.com
            </a>{" "}
            and we will investigate promptly.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">6. AI-Generated Content</h2>
          <p>
            ScolarNav uses large language models (including Claude by Anthropic) to provide coaching, feedback,
            roadmaps, interview practice, and opportunity matching. You acknowledge that:
          </p>
          <ul className="mt-3 space-y-2 list-disc list-inside">
            <li>AI-generated content may contain inaccuracies and should not be taken as professional advice.</li>
            <li>ScolarNav does not guarantee any scholarship outcome. Final decisions rest entirely with awarding committees.</li>
            <li>You should independently verify scholarship details, deadlines, and eligibility requirements before applying.</li>
            <li>AI coaching is a preparation tool â€” not a guarantee, endorsement, or prediction of success.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">7. CV and Personal Data</h2>
          <p>
            When you upload your CV, we parse and store its contents to power personalised features. You
            retain ownership of your CV and personal data. By uploading, you grant ScolarNav a limited licence
            to process that data solely to deliver the services described in these Terms.
          </p>
          <p className="mt-3">
            We do not sell your CV or personal data to third parties. See our{" "}
            <Link href="/privacy" className="text-forest hover:underline">
              Privacy Policy
            </Link>{" "}
            for full details.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">8. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="mt-3 space-y-2 list-disc list-inside">
            <li>Use the platform for any unlawful purpose or in violation of any applicable law.</li>
            <li>Attempt to reverse-engineer, scrape, or copy the platform's content or AI outputs at scale.</li>
            <li>Share your account credentials or allow others to use your account.</li>
            <li>Submit false or misleading information in your profile or CV.</li>
            <li>Use the platform to harass, deceive, or defraud scholarship committees or institutions.</li>
            <li>Attempt to circumvent rate limits, access controls, or subscription gating.</li>
          </ul>
          <p className="mt-3">
            We reserve the right to suspend or permanently terminate accounts that violate these terms,
            without refund.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">9. Intellectual Property</h2>
          <p>
            All platform content â€” including the design, text, branding, code, and AI prompts â€” is the
            property of ScolarNav or its licensors. You may not reproduce or redistribute any
            part of the platform without our written permission.
          </p>
          <p className="mt-3">
            Content you create (your profile, notes, uploaded documents) remains yours. You grant us a
            non-exclusive licence to process and display it within the platform to provide the service.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">10. Third-Party Services</h2>
          <p>
            ScolarNav integrates with third-party services including Stripe (payment processing), Paystack
            (payment processing for African users), Google (authentication), and Anthropic (AI). Your use
            of these services is subject to their respective terms and privacy policies. We are not
            responsible for the practices of these third parties.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">11. Disclaimers and Limitation of Liability</h2>
          <p>
            The platform is provided "as is" without warranties of any kind, express or implied. To the
            fullest extent permitted by law, ScolarNav shall not be liable for any indirect, incidental,
            special, or consequential damages arising from your use of the platform â€” including, without
            limitation, loss of scholarship opportunities or application outcomes.
          </p>
          <p className="mt-3">
            Our total liability to you for any claim arising from these Terms or your use of the platform
            shall not exceed the amount you paid to us in the 12 months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">12. Account Deletion</h2>
          <p>
            You may delete your account at any time from your profile settings. Deletion permanently removes
            your personal data, CV, and application history from our systems, subject to any retention
            obligations imposed by law or our payment processors.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">13. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you by email or in-app notice before
            material changes take effect. Continued use of the platform after the effective date constitutes
            acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">14. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be
            resolved in the courts of Lagos State, Nigeria, unless otherwise required by applicable consumer
            protection law in your jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">15. Contact</h2>
          <p>
            Questions about these Terms? Reach us at{" "}
            <a href="mailto:mail@ScolarNav.com" className="text-forest hover:underline">
              mail@ScolarNav.com
            </a>
            .
          </p>
        </section>

      </div>

      <div className="mt-14 pt-8 border-t border-rule flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <p className="text-xs font-mono text-slate">Â© 2026 ScolarNav. All rights reserved.</p>
        <Link href="/privacy" className="text-sm text-forest font-medium hover:underline">
          Privacy Policy â†’
        </Link>
      </div>
    </div>
  );
}
