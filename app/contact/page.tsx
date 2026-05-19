import type { Metadata } from "next";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";

// BOILERPLATE: Requires legal review before beta launch.
//
// Round-35: /contact replaces the old /impressum route. Carries the
// member-support + business inboxes, the full Fortex Media Ltd.
// company-information block, the trading-risk disclosure, and the
// content/liability + dispute-resolution boilerplate that the
// Companies-House-registered UK entity needs published.

export const metadata: Metadata = {
  title: "Contact · PT System",
  description:
    "Get in touch and find our company info. PT System is a product of Fortex Media Ltd., London.",
  alternates: { canonical: "/contact" },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 px-6 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Contact
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg sm:leading-[1.7]">
            Get in touch and find our company info.
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
            Last updated: 19 May 2026 · Boilerplate, subject to legal review
          </p>

          <div className="mt-12 space-y-12 text-base leading-[1.75] text-muted-foreground sm:text-[17px]">
            <Section title="Get in touch">
              <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
                <ContactBlock
                  label="Member support"
                  email="hello@ptsystem.ai"
                  note="For questions about your subscription, technical issues, or feedback — this is the fastest way to reach us."
                />
                <ContactBlock
                  label="Legal & business"
                  email="hello@fortex-media.com"
                  note="Company correspondence, partnership requests, and anything legal."
                />
              </div>
            </Section>

            <Section title="Company information">
              <p>PT System is a product of:</p>
              <address className="not-italic text-foreground">
                Fortex Media Ltd.
                <br />
                71-75 Shelton Street, Covent Garden
                <br />
                London, United Kingdom
                <br />
                WC2H 9JQ
              </address>
              <dl className="space-y-2.5 pt-2">
                <Field label="Company Number">
                  Pending Companies House registration update — to be
                  published here.
                </Field>
                <Field label="VAT Number">
                  Not currently registered for VAT.
                </Field>
                <Field label="Jurisdiction">
                  Registered in England and Wales.
                </Field>
              </dl>
            </Section>

            <Section title="Responsible person">
              <p className="text-foreground">
                Paul Theobald
                <br />
                <span className="text-muted-foreground">
                  Director, Fortex Media Ltd.
                </span>
              </p>
            </Section>

            <Section title="Trading risk disclosure">
              <p>
                Trading cryptocurrency futures involves substantial risk
                of loss and is not suitable for every investor. The
                leverage available in crypto futures trading creates
                additional risk and exposure.
              </p>
              <p>
                PT System provides educational content and mentorship
                tools only. Nothing on this platform constitutes
                financial, investment, or trading advice. Past
                performance is not indicative of future results.
              </p>
              <p>
                Always do your own research and consider consulting a
                qualified financial advisor before making investment
                decisions.
              </p>
            </Section>

            <Section title="Content & liability">
              <p>
                While we strive to provide accurate and up-to-date
                information, PT System makes no warranties regarding
                the completeness, accuracy, or reliability of any
                content. External links are provided for informational
                purposes only — we have no control over the content of
                those sites.
              </p>
            </Section>

            <Section title="Dispute resolution">
              <p>
                The European Commission provides a platform for online
                dispute resolution (ODR) at{" "}
                <a
                  href="https://ec.europa.eu/consumers/odr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald transition-colors hover:text-emerald-hover"
                >
                  ec.europa.eu/consumers/odr
                </a>
                . We are not obligated and not willing to participate in
                dispute resolution proceedings before consumer
                arbitration boards.
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
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ContactBlock({
  label,
  email,
  note,
}: {
  label: string;
  email: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      <a
        href={`mailto:${email}`}
        className="mt-1.5 block text-base font-medium text-emerald transition-colors hover:text-emerald-hover"
      >
        {email}
      </a>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {note}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-foreground">{children}</dd>
    </div>
  );
}
