import type { Metadata } from "next";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";

// BOILERPLATE: Requires legal review before beta launch.

export const metadata: Metadata = {
  title: "Refund Policy · PT System",
  description: "How refunds and cancellations work on PT System.",
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
          <p className="mt-3 text-base text-muted-foreground sm:text-lg sm:leading-[1.7]">
            How refunds and cancellations work.
          </p>

          <div className="mt-12 space-y-10 text-base leading-[1.75] text-muted-foreground sm:text-[17px]">
            <Section title="1. 14-day free trial">
              <p>
                All new subscriptions begin with a 14-day free trial.
                No payment is required to start. You can use Aven and
                the full PT System service during this period at no
                cost.
              </p>
              <p>
                If you cancel before the trial ends, you will not be
                charged.
              </p>
            </Section>

            <Section title="2. After the trial">
              <p>
                After the 14-day trial, your subscription begins
                billing at the selected plan. We do not offer refunds
                for billing periods that have already started, except
                in cases described below.
              </p>
            </Section>

            <Section title="3. Cancellation">
              <p>
                You can cancel your subscription at any time from your
                dashboard settings. Cancellation takes effect at the
                end of your current billing cycle — you retain access
                to paid features until then.
              </p>
              <p>
                After cancellation, your subscription will not renew.
                Auto-renewal can also be paused without cancelling.
              </p>
            </Section>

            <Section title="4. Exceptional refunds">
              <p>
                In exceptional circumstances — such as a technical
                issue that prevented you from using the service, or
                duplicate billing — we may issue a refund at our
                discretion. Contact{" "}
                <a
                  href="mailto:hello@ptsystem.ai"
                  className="text-emerald transition-colors hover:text-emerald-hover"
                >
                  hello@ptsystem.ai
                </a>{" "}
                within 14 days of the disputed charge.
              </p>
            </Section>

            <Section title="5. Chargebacks">
              <p>
                We ask that you contact us before initiating a
                chargeback through your bank or card provider. Most
                billing concerns can be resolved directly.
              </p>
              <p>
                Initiating a chargeback without first contacting us may
                result in suspension or termination of your account.
              </p>
            </Section>

            <Section title="6. Contact">
              <p>
                For refund requests:{" "}
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
