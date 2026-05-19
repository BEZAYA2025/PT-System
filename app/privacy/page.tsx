import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";

// BOILERPLATE: Requires legal review before beta launch.

export const metadata: Metadata = {
  title: "Privacy Policy · PT System",
  description:
    "How PT System collects, uses, and protects your data under UK GDPR.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 px-6 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg sm:leading-[1.7]">
            How we collect, use, and protect your data.
          </p>

          <div className="mt-12 space-y-10 text-base leading-[1.75] text-muted-foreground sm:text-[17px]">
            <Section title="1. Who we are">
              <p>
                PT System is a product operated by Fortex Media Ltd., a
                company registered in England and Wales. This Privacy
                Policy explains how we collect, use, and protect your
                personal information when you use our service.
              </p>
            </Section>

            <Section title="2. Information we collect">
              <p>
                <strong className="text-foreground">
                  Account information
                </strong>{" "}
                — name, email address, password (encrypted).
              </p>
              <p>
                <strong className="text-foreground">
                  Subscription information
                </strong>{" "}
                — payment processed via Stripe. We do not store credit
                card details on our servers. Stripe holds payment
                information securely under their own privacy policy.
              </p>
              <p>
                <strong className="text-foreground">
                  Exchange API keys
                </strong>{" "}
                — encrypted at rest, used in read-only mode to fetch
                your trade data. We never have authority to execute
                trades on your behalf.
              </p>
              <p>
                <strong className="text-foreground">Trade data</strong>{" "}
                — information about positions opened, closed,
                profit/loss, and trade history fetched from your
                connected exchange.
              </p>
              <p>
                <strong className="text-foreground">
                  Conversation data
                </strong>{" "}
                — messages exchanged with Aven AI (both web and
                Telegram), retained to provide context across
                conversations.
              </p>
              <p>
                <strong className="text-foreground">Technical data</strong>{" "}
                — IP address, browser type, device information, usage
                analytics.
              </p>
              <p>
                <strong className="text-foreground">
                  Communication preferences
                </strong>{" "}
                — notification settings, language preference.
              </p>
            </Section>

            <Section title="3. How we use your information">
              <p>
                To provide the PT System service — Aven AI, daily
                briefings, setup scanning, trade tracking.
              </p>
              <p>To process payments and manage subscriptions.</p>
              <p>
                To send service-related communications (account
                updates, billing, critical alerts).
              </p>
              <p>
                To improve our service through anonymized usage
                analytics.
              </p>
              <p>To comply with legal obligations.</p>
              <p className="font-medium text-foreground">
                We do not sell your personal information to third
                parties.
              </p>
            </Section>

            <Section title="4. Third-party services">
              <p>
                We use the following third-party services that may
                process your data:
              </p>
              <ul>
                <li>Stripe (payment processing)</li>
                <li>Anthropic (AI processing for Aven conversations)</li>
                <li>Resend (transactional email delivery)</li>
                <li>
                  Telegram (chat integration, only if you connect your
                  account)
                </li>
                <li>Cloudflare (security and performance)</li>
                <li>Vercel (hosting)</li>
                <li>Neon (database hosting)</li>
              </ul>
              <p>
                Each service operates under its own privacy policy. We
                select providers with strong privacy and security
                standards.
              </p>
            </Section>

            <Section title="5. Data retention">
              <p>
                We retain your data for as long as your account is
                active or as needed to provide the service.
              </p>
              <p>
                If you cancel your subscription, your account data is
                retained for 30 days for potential reactivation, then
                deleted unless legal obligations require longer
                retention.
              </p>
              <p>
                You can request account deletion at any time via your
                dashboard settings or by emailing{" "}
                <a
                  href="mailto:hello@ptsystem.ai"
                  className="text-emerald transition-colors hover:text-emerald-hover"
                >
                  hello@ptsystem.ai
                </a>
                .
              </p>
            </Section>

            <Section title="6. Your rights (GDPR)">
              <p>
                If you are in the European Union or United Kingdom, you
                have the following rights regarding your personal data:
              </p>
              <ul>
                <li>
                  <strong className="text-foreground">
                    Right to access
                  </strong>{" "}
                  — request a copy of the data we hold about you.
                </li>
                <li>
                  <strong className="text-foreground">
                    Right to rectification
                  </strong>{" "}
                  — correct inaccurate or incomplete data.
                </li>
                <li>
                  <strong className="text-foreground">
                    Right to erasure
                  </strong>{" "}
                  — request deletion of your data (subject to legal
                  retention requirements).
                </li>
                <li>
                  <strong className="text-foreground">
                    Right to data portability
                  </strong>{" "}
                  — receive your data in a portable format.
                </li>
                <li>
                  <strong className="text-foreground">
                    Right to object
                  </strong>{" "}
                  — to certain processing activities.
                </li>
                <li>
                  <strong className="text-foreground">
                    Right to withdraw consent
                  </strong>{" "}
                  — for any consent-based processing.
                </li>
              </ul>
              <p>
                To exercise these rights, contact{" "}
                <a
                  href="mailto:hello@ptsystem.ai"
                  className="text-emerald transition-colors hover:text-emerald-hover"
                >
                  hello@ptsystem.ai
                </a>
                .
              </p>
            </Section>

            <Section title="7. International data transfers">
              <p>
                Your data may be processed in countries outside your
                country of residence, including the United States and
                Singapore (where our infrastructure providers operate).
                We rely on appropriate safeguards including Standard
                Contractual Clauses where required.
              </p>
            </Section>

            <Section title="8. Cookies">
              <p>
                We use cookies for essential functionality, analytics,
                and authentication. See our{" "}
                <Link
                  href="/cookies"
                  className="text-emerald transition-colors hover:text-emerald-hover"
                >
                  Cookie Policy
                </Link>{" "}
                for details.
              </p>
            </Section>

            <Section title="9. Security">
              <p>
                We implement industry-standard security measures
                including encryption at rest, encrypted connections
                (HTTPS/TLS), secure authentication, and regular
                security reviews. However, no method of transmission or
                storage is 100% secure.
              </p>
            </Section>

            <Section title="10. Children">
              <p>
                PT System is not intended for users under 18 years of
                age. We do not knowingly collect data from minors.
              </p>
            </Section>

            <Section title="11. Changes to this policy">
              <p>
                We may update this Privacy Policy from time to time.
                Material changes will be communicated to users via
                email or in-app notification.
              </p>
            </Section>

            <Section title="12. Contact">
              <p>
                For privacy-related questions:{" "}
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
