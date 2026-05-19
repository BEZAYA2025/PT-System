import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";

// BOILERPLATE: Requires legal review before beta launch.

export const metadata: Metadata = {
  title: "Terms of Service · PT System",
  description: "The rules of using PT System.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 px-6 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg sm:leading-[1.7]">
            The rules of using PT System.
          </p>

          <div className="mt-12 space-y-10 text-base leading-[1.75] text-muted-foreground sm:text-[17px]">
            <Section title="1. Acceptance of Terms">
              <p>
                By accessing or using PT System, you agree to be bound
                by these Terms of Service. If you do not agree, do not
                use the service.
              </p>
            </Section>

            <Section title="2. Service description">
              <p>
                PT System is an educational mentorship platform
                featuring Aven, an AI trading mentor trained on the
                Wave Riding Method developed by Paul Theobald. The
                service provides daily market briefings, setup
                analysis, trade tracking, and AI-powered conversation
                about cryptocurrency trading strategy.
              </p>
              <p>
                PT System is not a brokerage, exchange, financial
                advisor, or investment manager. We do not execute
                trades on your behalf and do not hold your funds.
              </p>
            </Section>

            <Section title="3. Eligibility">
              <p>
                You must be at least 18 years of age to use PT System.
                By using the service, you confirm that you meet this
                age requirement.
              </p>
            </Section>

            <Section title="4. Account registration">
              <p>
                You are responsible for maintaining the confidentiality
                of your account credentials and for all activity that
                occurs under your account. Notify us immediately of any
                unauthorized use.
              </p>
              <p>
                You must provide accurate, current information during
                registration.
              </p>
            </Section>

            <Section title="5. Subscription, trial, and billing">
              <p>
                PT System offers two subscription tiers: Aven Standard
                and Aven VIP. Pricing and features are listed on our{" "}
                <Link
                  href="/pricing"
                  className="text-emerald transition-colors hover:text-emerald-hover"
                >
                  pricing page
                </Link>
                .
              </p>
              <p>
                We offer a 14-day free trial. No credit card is
                required at the start of the trial. After the trial,
                subscriptions are billed according to the plan you
                selected.
              </p>
              <p>
                Subscriptions auto-renew at the end of each billing
                cycle until cancelled. You may cancel at any time from
                your dashboard settings.
              </p>
              <p>
                Pricing is subject to change. Existing subscribers will
                be notified in advance of any price changes affecting
                their plan.
              </p>
            </Section>

            <Section title="6. Cancellation and refunds">
              <p>
                You may cancel your subscription at any time.
                Cancellation prevents future renewals. You retain
                access to paid features until the end of the current
                billing cycle.
              </p>
              <p>
                We do not offer refunds for the current billing cycle
                after the free trial period has ended. See our{" "}
                <Link
                  href="/refund"
                  className="text-emerald transition-colors hover:text-emerald-hover"
                >
                  Refund Policy
                </Link>{" "}
                for details.
              </p>
            </Section>

            <Section title="7. Acceptable use">
              <p>You agree not to:</p>
              <ul>
                <li>Use the service for any unlawful purpose</li>
                <li>
                  Attempt to gain unauthorized access to other accounts
                  or our infrastructure
                </li>
                <li>
                  Reverse engineer, scrape, or systematically extract
                  content
                </li>
                <li>Share your account credentials with others</li>
                <li>Use the service to harm or harass others</li>
                <li>
                  Distribute content from PT System without
                  authorization
                </li>
                <li>
                  Use the service to violate any applicable financial
                  regulations
                </li>
              </ul>
            </Section>

            <Section title="8. Intellectual property">
              <p>
                All content provided through PT System — including the
                Aven AI system, the Wave Riding Method documentation,
                daily briefings, setup analyses, and platform interface
                — is the intellectual property of Fortex Media Ltd. or
                its licensors.
              </p>
              <p>
                You receive a limited, non-exclusive, non-transferable
                license to use the service for personal trading
                education. You may not reproduce, redistribute, or
                commercially exploit any content without express
                written permission.
              </p>
            </Section>

            <Section title="9. No financial advice">
              <p>
                The content provided through PT System is for
                educational and informational purposes only. It does
                not constitute financial, investment, legal, or tax
                advice. We are not licensed financial advisors.
              </p>
              <p>
                Trading cryptocurrency futures involves substantial
                risk of loss. You are solely responsible for your
                trading decisions and financial outcomes.
              </p>
              <p>
                Past performance shown on PT System does not guarantee
                future results. You should consult with qualified
                professionals before making investment decisions.
              </p>
            </Section>

            <Section title="10. Disclaimers and limitation of liability">
              <p>
                PT System is provided &ldquo;as is&rdquo; without
                warranties of any kind, express or implied.
              </p>
              <p>
                To the maximum extent permitted by law, Fortex Media
                Ltd. shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages, including
                but not limited to loss of profits, trading losses,
                data loss, or business interruption — even if advised
                of the possibility of such damages.
              </p>
              <p>
                Our total aggregate liability shall not exceed the
                amount you paid for the service in the 12 months
                preceding the claim.
              </p>
            </Section>

            <Section title="11. Termination">
              <p>
                We may suspend or terminate your access to PT System at
                any time for violation of these Terms or for any reason
                at our discretion. You may cancel your account at any
                time.
              </p>
            </Section>

            <Section title="12. Governing law">
              <p>
                These Terms are governed by the laws of England and
                Wales. Any disputes shall be resolved in the courts of
                England and Wales.
              </p>
            </Section>

            <Section title="13. Changes to these Terms">
              <p>
                We may update these Terms from time to time. Material
                changes will be communicated via email or in-app
                notification. Continued use of the service after
                changes constitutes acceptance.
              </p>
            </Section>

            <Section title="14. Contact">
              <p>
                For questions about these Terms:{" "}
                <a
                  href="mailto:hello@ptsystem.ai"
                  className="text-emerald transition-colors hover:text-emerald-hover"
                >
                  hello@ptsystem.ai
                </a>
              </p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      <div className="space-y-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
        {children}
      </div>
    </section>
  );
}
