import type { Metadata } from "next";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";

// BOILERPLATE: Requires legal review before launch.

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "PT System refund policy — 30-day money-back guarantee on first-time subscriptions.",
  alternates: { canonical: "/refund" },
  robots: { index: true, follow: true },
};

export default function RefundPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 px-6 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Refund Policy
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Last updated: 19 May 2026 · Boilerplate, subject to legal review
          </p>

          <div className="mt-10 space-y-10 text-base leading-[1.75] text-muted-foreground sm:text-[17px]">
            <Section title="30-Day Money-Back Guarantee">
              <p>
                We offer a 30-day money-back guarantee on your{" "}
                <strong className="text-foreground">first paid subscription</strong>{" "}
                to PT System. If the platform isn&apos;t the right fit
                within 30 days of your first charge, you can request a
                full refund — no questions asked, no friction.
              </p>
              <p>
                This guarantee applies once, to the first paid period
                after any free-trial window. It is intended as a good-
                faith trial extension, not a recurring opt-out.
              </p>
            </Section>

            <Section title="How to request a refund">
              <p>
                Email us at{" "}
                <a
                  href="mailto:hello@ptsystem.ai?subject=Refund%20Request"
                  className="text-emerald transition-colors hover:text-emerald-hover"
                >
                  hello@ptsystem.ai
                </a>{" "}
                with the subject &ldquo;Refund Request&rdquo;. Include
                the email address on your account so we can match it.
                You don&apos;t need to explain why; a one-line ask is
                enough.
              </p>
              <p>
                We aim to acknowledge every refund request within one
                business day.
              </p>
            </Section>

            <Section title="Processing time">
              <p>
                Approved refunds are processed within 5–10 business
                days via the same payment method you used for the
                original charge. Card refunds typically show up on your
                statement within one to two billing cycles depending on
                your bank.
              </p>
              <p>
                We&apos;ll confirm by email once the refund has been
                issued from our side. If you don&apos;t see it credited
                after 10 business days, reply to that confirmation and
                we&apos;ll investigate with our payment processor.
              </p>
            </Section>

            <Section title="Exclusions">
              <p>This policy does not cover:</p>
              <ul>
                <li>
                  <strong className="text-foreground">
                    Subscription renewals.
                  </strong>{" "}
                  Only the first paid period is eligible for the
                  money-back guarantee. To stop a renewal, cancel your
                  subscription before the renewal date — your access
                  continues until the end of the paid period and no
                  further charges occur.
                </li>
                <li>
                  <strong className="text-foreground">
                    Partial-period refunds.
                  </strong>{" "}
                  We don&apos;t pro-rate refunds for unused days within
                  a billing period.
                </li>
                <li>
                  <strong className="text-foreground">
                    Annual plans more than 30 days in.
                  </strong>{" "}
                  Annual subscriptions are eligible for a full refund
                  within the first 30 days; after that, the standard
                  cancellation rules apply (access continues to the
                  paid period&apos;s end, no renewal).
                </li>
              </ul>
            </Section>

            <Section title="Cancellation">
              <p>
                You can cancel your subscription at any time from your
                dashboard at{" "}
                <a
                  href="/dashboard/settings"
                  className="text-emerald transition-colors hover:text-emerald-hover"
                >
                  Settings → Subscription
                </a>
                . Cancellation takes effect at the end of the current
                billing period; access remains active until then. You
                won&apos;t be charged again.
              </p>
              <p>
                You can also reactivate a cancelled subscription before
                its access period ends — without losing dashboard data
                — from the same screen.
              </p>
            </Section>

            <Section title="Statutory rights">
              <p>
                Your statutory consumer rights — including any local
                rights to withdraw from a digital purchase under EU /
                UK consumer protection rules — are not affected by this
                policy. Where local law grants you a longer window than
                30 days, that longer window applies.
              </p>
            </Section>

            <Section title="Contact us">
              <p>
                Refund questions, edge cases, or anything not covered
                above: email{" "}
                <a
                  href="mailto:hello@ptsystem.ai"
                  className="text-emerald transition-colors hover:text-emerald-hover"
                >
                  hello@ptsystem.ai
                </a>{" "}
                and we&apos;ll handle it personally.
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
